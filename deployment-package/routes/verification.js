const express = require('express');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();

// Import services and middleware
const geminiService = require('../services/gemini');
const { createReport, updateReportVerification } = require('../services/supabase');
const { 
  authenticateUser, 
  requirePermission, 
  auditLog, 
  userRateLimit 
} = require('../middleware/auth');
const { logger, logImageVerification } = require('../utils/logger');

// Apply authentication to all routes
router.use(authenticateUser);
router.use(userRateLimit(60000, 20)); // 20 requests per minute per user (rate limiting for Gemini API)

// POST /verification/:disasterId/verify-image - Verify image authenticity
router.post('/:disasterId/verify-image', 
  requirePermission('write'),
  auditLog('verify_image'),
  async (req, res) => {
    try {
      const { disasterId } = req.params;
      const { image_url, disaster_context = '', user_id } = req.body;
      
      if (!image_url) {
        return res.status(400).json({
          error: 'Missing required field',
          message: 'image_url is required'
        });
      }

      // Verify image using Gemini Vision API
      const verificationResult = await geminiService.verifyImageAuthenticity(image_url, disaster_context);
      
      // Create report record
      const reportData = {
        id: uuidv4(),
        disaster_id: disasterId,
        user_id: user_id || req.user.id,
        content: `Image verification request: ${image_url}`,
        image_url,
        verification_status: verificationResult.manipulation_detected ? 'suspicious' : 'verified',
        verification_details: verificationResult,
        created_at: new Date().toISOString()
      };

      const report = await createReport(reportData);
      
      // Emit real-time update
      const io = req.app.get('io');
      io.to(`disaster-${disasterId}`).emit('image_verification_completed', {
        disaster_id: disasterId,
        report,
        verification_result: verificationResult,
        verified_by: req.user.username,
        timestamp: new Date().toISOString()
      });

      logImageVerification(disasterId, image_url, verificationResult.verification_status);

      res.json({
        message: 'Image verification completed',
        disaster_id: disasterId,
        report,
        verification_result: verificationResult
      });

    } catch (error) {
      logger.error('Error verifying image:', error);
      res.status(500).json({
        error: 'Failed to verify image',
        message: error.message
      });
    }
  }
);

// POST /verification/:disasterId/submit-report - Submit a new report
router.post('/:disasterId/submit-report', 
  requirePermission('write'),
  auditLog('submit_report'),
  async (req, res) => {
    try {
      const { disasterId } = req.params;
      const { content, image_url, user_id } = req.body;
      
      if (!content) {
        return res.status(400).json({
          error: 'Missing required field',
          message: 'content is required'
        });
      }

      // Create report record
      const reportData = {
        id: uuidv4(),
        disaster_id: disasterId,
        user_id: user_id || req.user.id,
        content,
        image_url: image_url || null,
        verification_status: 'pending',
        created_at: new Date().toISOString()
      };

      const report = await createReport(reportData);
      
      // If image is provided, verify it automatically
      let verificationResult = null;
      if (image_url) {
        try {
          verificationResult = await geminiService.verifyImageAuthenticity(image_url, content);
          
          // Update report with verification result
          const updateData = {
            verification_status: verificationResult.manipulation_detected ? 'suspicious' : 'verified',
            verification_details: verificationResult
          };
          
          await updateReportVerification(report.id, updateData.verification_status);
          report.verification_status = updateData.verification_status;
          report.verification_details = verificationResult;
          
          logImageVerification(disasterId, image_url, updateData.verification_status);
        } catch (verificationError) {
          logger.warn('Image verification failed during report submission:', verificationError);
        }
      }

      // Emit real-time update
      const io = req.app.get('io');
      io.to(`disaster-${disasterId}`).emit('report_submitted', {
        disaster_id: disasterId,
        report,
        verification_result: verificationResult,
        submitted_by: req.user.username,
        timestamp: new Date().toISOString()
      });

      res.status(201).json({
        message: 'Report submitted successfully',
        disaster_id: disasterId,
        report,
        verification_result: verificationResult
      });

    } catch (error) {
      logger.error('Error submitting report:', error);
      res.status(500).json({
        error: 'Failed to submit report',
        message: error.message
      });
    }
  }
);

// PUT /verification/reports/:reportId/verify - Manually verify a report
router.put('/reports/:reportId/verify', 
  requirePermission('write'),
  auditLog('manual_verify_report'),
  async (req, res) => {
    try {
      const { reportId } = req.params;
      const { verification_status, verification_notes } = req.body;
      
      if (!verification_status || !['pending', 'verified', 'suspicious', 'rejected'].includes(verification_status)) {
        return res.status(400).json({
          error: 'Invalid verification status',
          message: 'verification_status must be one of: pending, verified, suspicious, rejected'
        });
      }

      // Update report verification status
      const updatedReport = await updateReportVerification(reportId, verification_status);
      
      // Add verification notes if provided
      if (verification_notes) {
        // You might want to add a notes field to the reports table
        logger.info(`Verification notes for report ${reportId}: ${verification_notes}`);
      }

      // Emit real-time update
      const io = req.app.get('io');
      io.emit('report_verification_updated', {
        report_id: reportId,
        verification_status,
        verification_notes,
        updated_by: req.user.username,
        timestamp: new Date().toISOString()
      });

      res.json({
        message: 'Report verification status updated',
        report_id: reportId,
        verification_status,
        verification_notes,
        updated_report: updatedReport
      });

    } catch (error) {
      logger.error('Error updating report verification:', error);
      res.status(500).json({
        error: 'Failed to update report verification',
        message: error.message
      });
    }
  }
);

// POST /verification/:disasterId/bulk-verify - Bulk verify multiple images
router.post('/:disasterId/bulk-verify', 
  requirePermission('write'),
  auditLog('bulk_verify_images'),
  async (req, res) => {
    try {
      const { disasterId } = req.params;
      const { images } = req.body;
      
      if (!Array.isArray(images) || images.length === 0) {
        return res.status(400).json({
          error: 'Invalid images data',
          message: 'images must be a non-empty array'
        });
      }

      const verificationResults = [];
      const errors = [];

      for (const imageData of images) {
        try {
          const { image_url, disaster_context = '', user_id } = imageData;
          
          if (!image_url) {
            errors.push({
              image: imageData,
              error: 'Missing image_url'
            });
            continue;
          }

          // Verify image
          const verificationResult = await geminiService.verifyImageAuthenticity(image_url, disaster_context);
          
          // Create report record
          const reportData = {
            id: uuidv4(),
            disaster_id: disasterId,
            user_id: user_id || req.user.id,
            content: `Bulk image verification: ${image_url}`,
            image_url,
            verification_status: verificationResult.manipulation_detected ? 'suspicious' : 'verified',
            verification_details: verificationResult,
            created_at: new Date().toISOString()
          };

          const report = await createReport(reportData);
          
          verificationResults.push({
            image_url,
            report,
            verification_result: verificationResult
          });
          
          logImageVerification(disasterId, image_url, verificationResult.verification_status);

        } catch (error) {
          errors.push({
            image: imageData,
            error: error.message
          });
        }
      }

      // Emit real-time update for bulk verification
      const io = req.app.get('io');
      io.to(`disaster-${disasterId}`).emit('bulk_verification_completed', {
        disaster_id: disasterId,
        verified_count: verificationResults.length,
        error_count: errors.length,
        verified_by: req.user.username,
        timestamp: new Date().toISOString()
      });

      res.json({
        message: 'Bulk image verification completed',
        disaster_id: disasterId,
        verification_results: verificationResults,
        verified_count: verificationResults.length,
        errors,
        error_count: errors.length
      });

    } catch (error) {
      logger.error('Error in bulk image verification:', error);
      res.status(500).json({
        error: 'Failed to perform bulk image verification',
        message: error.message
      });
    }
  }
);

// GET /verification/:disasterId/reports - Get verification reports for a disaster
router.get('/:disasterId/reports', 
  requirePermission('read'),
  auditLog('get_verification_reports'),
  async (req, res) => {
    try {
      const { disasterId } = req.params;
      const { status, limit = 50, offset = 0 } = req.query;
      
      // This would typically fetch from the reports table
      // For now, return mock data
      const mockReports = [
        {
          id: 'report_1',
          disaster_id: disasterId,
          user_id: 'citizen1',
          content: 'Flood damage in Lower East Side',
          image_url: 'https://example.com/flood1.jpg',
          verification_status: 'verified',
          created_at: new Date().toISOString()
        },
        {
          id: 'report_2',
          disaster_id: disasterId,
          user_id: 'fieldWorker',
          content: 'Emergency shelter needed',
          image_url: null,
          verification_status: 'pending',
          created_at: new Date(Date.now() - 3600000).toISOString()
        }
      ];

      // Filter by status if specified
      let filteredReports = mockReports;
      if (status) {
        filteredReports = mockReports.filter(report => report.verification_status === status);
      }
      
      // Apply pagination
      const paginatedReports = filteredReports.slice(offset, offset + parseInt(limit));

      res.json({
        disaster_id: disasterId,
        reports: paginatedReports,
        pagination: {
          total: filteredReports.length,
          limit: parseInt(limit),
          offset: parseInt(offset),
          has_more: offset + parseInt(limit) < filteredReports.length
        },
        status_filter: status || 'all'
      });

    } catch (error) {
      logger.error('Error getting verification reports:', error);
      res.status(500).json({
        error: 'Failed to get verification reports',
        message: error.message
      });
    }
  }
);

// GET /verification/analytics - Get verification analytics
router.get('/analytics', 
  requirePermission('read'),
  auditLog('get_verification_analytics'),
  async (req, res) => {
    try {
      const { disasterId } = req.query;
      
      if (!disasterId) {
        return res.status(400).json({
          error: 'Missing disaster ID',
          message: 'disasterId query parameter is required'
        });
      }

      // Mock analytics data
      const analytics = {
        disaster_id: disasterId,
        total_reports: 25,
        verification_status_breakdown: {
          pending: 5,
          verified: 15,
          suspicious: 3,
          rejected: 2
        },
        verification_rate: 92, // percentage
        average_verification_time: '2.5 minutes',
        top_verifiers: [
          { user_id: 'netrunnerX', verifications: 12 },
          { user_id: 'reliefAdmin', verifications: 8 },
          { user_id: 'fieldWorker', verifications: 5 }
        ]
      };

      res.json(analytics);

    } catch (error) {
      logger.error('Error getting verification analytics:', error);
      res.status(500).json({
        error: 'Failed to get verification analytics',
        message: error.message
      });
    }
  }
);

module.exports = router; 