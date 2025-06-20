const express = require('express');
const router = express.Router();

// Import services and middleware
const socialMediaService = require('../services/socialMedia');
const { 
  authenticateUser, 
  requirePermission, 
  auditLog, 
  userRateLimit 
} = require('../middleware/auth');
const { logger } = require('../utils/logger');

// Apply authentication to all routes
router.use(authenticateUser);
router.use(userRateLimit(60000, 50)); // 50 requests per minute per user

// GET /social-media/:disasterId - Get social media reports for a disaster
router.get('/:disasterId', 
  requirePermission('read'),
  auditLog('get_social_media'),
  async (req, res) => {
    try {
      const { disasterId } = req.params;
      const { keywords = [], priority } = req.query;
      
      // Parse keywords from query string
      const keywordArray = Array.isArray(keywords) ? keywords : keywords.split(',').filter(k => k.trim());
      
      const reports = await socialMediaService.getSocialMediaReports(disasterId, keywordArray);
      
      // Filter by priority if specified
      let filteredReports = reports;
      if (priority) {
        filteredReports = reports.filter(report => report.priority === priority);
      }

      // Emit real-time update for new reports
      const io = req.app.get('io');
      io.to(`disaster-${disasterId}`).emit('social_media_updated', {
        disaster_id: disasterId,
        reports: filteredReports,
        timestamp: new Date().toISOString()
      });

      res.json({
        disaster_id: disasterId,
        reports: filteredReports,
        total_count: filteredReports.length,
        priority_filter: priority || 'all',
        keywords_used: keywordArray
      });

    } catch (error) {
      logger.error('Error getting social media reports:', error);
      res.status(500).json({
        error: 'Failed to get social media reports',
        message: error.message
      });
    }
  }
);

// GET /social-media/:disasterId/priority-alerts - Get priority alerts only
router.get('/:disasterId/priority-alerts', 
  requirePermission('read'),
  auditLog('get_priority_alerts'),
  async (req, res) => {
    try {
      const { disasterId } = req.params;
      
      const priorityAlerts = await socialMediaService.getPriorityAlerts(disasterId);
      
      // Emit real-time update for priority alerts
      const io = req.app.get('io');
      io.to(`disaster-${disasterId}`).emit('priority_alert', {
        disaster_id: disasterId,
        alerts: priorityAlerts,
        timestamp: new Date().toISOString()
      });

      res.json({
        disaster_id: disasterId,
        priority_alerts: priorityAlerts,
        alert_count: priorityAlerts.length
      });

    } catch (error) {
      logger.error('Error getting priority alerts:', error);
      res.status(500).json({
        error: 'Failed to get priority alerts',
        message: error.message
      });
    }
  }
);

// GET /social-media/location/:locationKeywords - Get reports by location
router.get('/location/:locationKeywords', 
  requirePermission('read'),
  auditLog('get_location_reports'),
  async (req, res) => {
    try {
      const { locationKeywords } = req.params;
      const keywords = locationKeywords.split(',').map(k => k.trim());
      
      const reports = await socialMediaService.getReportsByLocation(keywords);
      
      res.json({
        location_keywords: keywords,
        reports,
        total_count: reports.length
      });

    } catch (error) {
      logger.error('Error getting location-based reports:', error);
      res.status(500).json({
        error: 'Failed to get location-based reports',
        message: error.message
      });
    }
  }
);

// POST /social-media/:disasterId/simulate-updates - Simulate real-time updates
router.post('/:disasterId/simulate-updates', 
  requirePermission('write'),
  auditLog('simulate_social_updates'),
  async (req, res) => {
    try {
      const { disasterId } = req.params;
      
      // Start simulation
      const updates = await socialMediaService.simulateRealTimeUpdates(disasterId, (update) => {
        const io = req.app.get('io');
        io.to(`disaster-${disasterId}`).emit('social_media_realtime', {
          disaster_id: disasterId,
          update,
          timestamp: new Date().toISOString()
        });
      });

      res.json({
        message: 'Real-time simulation started',
        disaster_id: disasterId,
        initial_updates: updates
      });

    } catch (error) {
      logger.error('Error starting real-time simulation:', error);
      res.status(500).json({
        error: 'Failed to start real-time simulation',
        message: error.message
      });
    }
  }
);

// GET /social-media/platforms/summary - Get summary by platform
router.get('/platforms/summary', 
  requirePermission('read'),
  auditLog('get_platform_summary'),
  async (req, res) => {
    try {
      const { disasterId } = req.query;
      
      if (!disasterId) {
        return res.status(400).json({
          error: 'Missing disaster ID',
          message: 'disasterId query parameter is required'
        });
      }

      const reports = await socialMediaService.getSocialMediaReports(disasterId);
      
      // Group by platform
      const platformSummary = reports.reduce((acc, report) => {
        const platform = report.platform;
        if (!acc[platform]) {
          acc[platform] = {
            platform,
            total_reports: 0,
            priority_counts: { urgent: 0, high: 0, medium: 0, low: 0 },
            recent_reports: []
          };
        }
        
        acc[platform].total_reports++;
        acc[platform].priority_counts[report.priority]++;
        
        // Add to recent reports (last 10)
        if (acc[platform].recent_reports.length < 10) {
          acc[platform].recent_reports.push({
            id: report.id,
            content: report.content.substring(0, 100) + '...',
            priority: report.priority,
            created_at: report.created_at
          });
        }
        
        return acc;
      }, {});

      res.json({
        disaster_id: disasterId,
        platform_summary: Object.values(platformSummary),
        total_reports: reports.length
      });

    } catch (error) {
      logger.error('Error getting platform summary:', error);
      res.status(500).json({
        error: 'Failed to get platform summary',
        message: error.message
      });
    }
  }
);

// POST /social-media/:disasterId/keyword-analysis - Analyze keywords in reports
router.post('/:disasterId/keyword-analysis', 
  requirePermission('read'),
  auditLog('analyze_keywords'),
  async (req, res) => {
    try {
      const { disasterId } = req.params;
      const { keywords = [] } = req.body;
      
      const reports = await socialMediaService.getSocialMediaReports(disasterId);
      
      // Analyze keyword frequency and sentiment
      const keywordAnalysis = {};
      
      keywords.forEach(keyword => {
        const matchingReports = reports.filter(report => 
          report.content.toLowerCase().includes(keyword.toLowerCase())
        );
        
        const priorityBreakdown = matchingReports.reduce((acc, report) => {
          acc[report.priority] = (acc[report.priority] || 0) + 1;
          return acc;
        }, {});
        
        keywordAnalysis[keyword] = {
          keyword,
          total_mentions: matchingReports.length,
          priority_breakdown: priorityBreakdown,
          sample_reports: matchingReports.slice(0, 5).map(r => ({
            id: r.id,
            content: r.content.substring(0, 150) + '...',
            priority: r.priority,
            platform: r.platform
          }))
        };
      });

      res.json({
        disaster_id: disasterId,
        keyword_analysis,
        analyzed_keywords: keywords
      });

    } catch (error) {
      logger.error('Error analyzing keywords:', error);
      res.status(500).json({
        error: 'Failed to analyze keywords',
        message: error.message
      });
    }
  }
);

// GET /social-media/mock-data - Get mock social media data (for testing)
router.get('/mock-data', 
  requirePermission('read'),
  auditLog('get_mock_data'),
  async (req, res) => {
    try {
      const { keywords = [] } = req.query;
      const keywordArray = Array.isArray(keywords) ? keywords : keywords.split(',').filter(k => k.trim());
      
      const mockReports = socialMediaService.getMockSocialMediaReports(keywordArray);
      
      res.json({
        reports: mockReports,
        total_count: mockReports.length,
        keywords_used: keywordArray,
        note: 'This is mock data for testing purposes'
      });

    } catch (error) {
      logger.error('Error getting mock data:', error);
      res.status(500).json({
        error: 'Failed to get mock data',
        message: error.message
      });
    }
  }
);

module.exports = router; 