const express = require('express');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();

// Import services and middleware
const { 
  createDisaster, 
  getDisasters, 
  updateDisaster, 
  deleteDisaster, 
  addAuditTrail 
} = require('../services/supabase');
const geminiService = require('../services/gemini');
const geocodingService = require('../services/geocoding');
const { 
  authenticateUser, 
  requirePermission, 
  auditLog, 
  userRateLimit 
} = require('../middleware/auth');
const { logger, logDisasterAction } = require('../utils/logger');

// Apply authentication to all routes
router.use(authenticateUser);
router.use(userRateLimit(60000, 100)); // 100 requests per minute per user

// POST /disasters - Create a new disaster
router.post('/', 
  requirePermission('write'),
  auditLog('create_disaster'),
  async (req, res) => {
    try {
      const { title, location_name, description, tags = [] } = req.body;
      
      if (!title || !description) {
        return res.status(400).json({
          error: 'Missing required fields',
          message: 'Title and description are required'
        });
      }

      // Extract location from description if not provided
      let finalLocationName = location_name;
      if (!finalLocationName) {
        const locationResult = await geminiService.extractLocationFromText(description);
        finalLocationName = locationResult.location;
        logger.info(`Location extracted from description: ${finalLocationName}`);
      }

      // Geocode the location
      let coordinates = null;
      if (finalLocationName && finalLocationName !== 'No location found') {
        const geocodeResult = await geocodingService.geocodeLocation(finalLocationName);
        coordinates = geocodeResult.coordinates;
        logger.info(`Location geocoded: ${finalLocationName} -> ${JSON.stringify(coordinates)}`);
      }

      // Analyze disaster description for additional insights
      const analysis = await geminiService.analyzeDisasterDescription(description);
      
      // Create disaster record
      const disasterData = {
        id: uuidv4(),
        title,
        location_name: finalLocationName,
        location: coordinates ? `POINT(${coordinates.longitude} ${coordinates.latitude})` : null,
        description,
        tags: Array.isArray(tags) ? tags : [tags],
        owner_id: req.user.id,
        created_at: new Date().toISOString(),
        audit_trail: [{
          action: 'created',
          user_id: req.user.id,
          timestamp: new Date().toISOString()
        }],
        severity_level: analysis.severity_level,
        disaster_type: analysis.disaster_type,
        urgency_indicator: analysis.urgency_indicator,
        affected_areas: analysis.affected_areas,
        key_needs: analysis.key_needs
      };

      const disaster = await createDisaster(disasterData);
      
      // Broadcast WebSocket event
      const io = req.app.get('io');
      io.emit('disaster_updated', { 
        disasterId: disaster.id, 
        action: 'created',
        disaster: disaster 
      });

      logDisasterAction('create', disaster.id, req.user.id, { title, location_name: finalLocationName });

      res.status(201).json({
        message: 'Disaster created successfully',
        disaster,
        location_extraction: {
          extracted_location: finalLocationName,
          coordinates,
          geocoding_source: coordinates ? 'geocoding_service' : 'none'
        },
        analysis
      });

    } catch (error) {
      logger.error('Error creating disaster:', error);
      res.status(500).json({
        error: 'Failed to create disaster',
        message: error.message
      });
    }
  }
);

// GET /disasters - Get all disasters with optional filtering
router.get('/', 
  requirePermission('read'),
  auditLog('list_disasters'),
  async (req, res) => {
    try {
      const { tag, owner_id, limit = 50, offset = 0 } = req.query;
      
      const filters = {};
      if (tag) filters.tag = tag;
      if (owner_id) filters.owner_id = owner_id;

      const disasters = await getDisasters(filters);
      
      // Apply pagination
      const paginatedDisasters = disasters.slice(offset, offset + parseInt(limit));

      res.json({
        disasters: paginatedDisasters,
        pagination: {
          total: disasters.length,
          limit: parseInt(limit),
          offset: parseInt(offset),
          has_more: offset + parseInt(limit) < disasters.length
        }
      });

    } catch (error) {
      logger.error('Error getting disasters:', error);
      res.status(500).json({
        error: 'Failed to get disasters',
        message: error.message
      });
    }
  }
);

// GET /disasters/:id - Get a specific disaster
router.get('/:id', 
  requirePermission('read'),
  auditLog('get_disaster'),
  async (req, res) => {
    try {
      const { id } = req.params;
      
      const disasters = await getDisasters();
      const disaster = disasters.find(d => d.id === id);
      
      if (!disaster) {
        return res.status(404).json({
          error: 'Disaster not found',
          message: `No disaster found with ID: ${id}`
        });
      }

      res.json({ disaster });

    } catch (error) {
      logger.error('Error getting disaster:', error);
      res.status(500).json({
        error: 'Failed to get disaster',
        message: error.message
      });
    }
  }
);

// PUT /disasters/:id - Update a disaster
router.put('/:id', 
  requirePermission('write'),
  auditLog('update_disaster'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const updates = {
        ...req.body,
        audit_trail: supabase.sql`audit_trail || ${JSON.stringify({
          action: 'updated',
          user_id: req.user.id,
          timestamp: new Date().toISOString()
        })}::jsonb`
      };

      const disaster = await updateDisaster(id, updates);
      
      // Broadcast WebSocket event
      const io = req.app.get('io');
      io.emit('disaster_updated', { 
        disasterId: id, 
        action: 'updated',
        disaster: disaster 
      });

      logDisasterAction('update', id, req.user.id, { updated_fields: Object.keys(updates) });

      res.json({
        message: 'Disaster updated successfully',
        disaster
      });

    } catch (error) {
      logger.error('Error updating disaster:', error);
      res.status(500).json({
        error: 'Failed to update disaster',
        message: error.message
      });
    }
  }
);

// DELETE /disasters/:id - Delete a disaster
router.delete('/:id', 
  requirePermission('delete'),
  auditLog('delete_disaster'),
  async (req, res) => {
    try {
      const { id } = req.params;
      
      await deleteDisaster(id);
      
      // Broadcast WebSocket event
      const io = req.app.get('io');
      io.emit('disaster_updated', { 
        disasterId: id, 
        action: 'deleted' 
      });

      logDisasterAction('delete', id, req.user.id, { title: disaster.title });

      res.json({
        message: 'Disaster deleted successfully',
        deleted_disaster_id: id
      });

    } catch (error) {
      logger.error('Error deleting disaster:', error);
      res.status(500).json({
        error: 'Failed to delete disaster',
        message: error.message
      });
    }
  }
);

// GET /disasters/:id/audit-trail - Get audit trail for a disaster
router.get('/:id/audit-trail', 
  requirePermission('read'),
  auditLog('get_audit_trail'),
  async (req, res) => {
    try {
      const { id } = req.params;
      
      const disasters = await getDisasters();
      const disaster = disasters.find(d => d.id === id);
      
      if (!disaster) {
        return res.status(404).json({
          error: 'Disaster not found',
          message: `No disaster found with ID: ${id}`
        });
      }

      res.json({
        disaster_id: id,
        audit_trail: disaster.audit_trail || []
      });

    } catch (error) {
      logger.error('Error getting audit trail:', error);
      res.status(500).json({
        error: 'Failed to get audit trail',
        message: error.message
      });
    }
  }
);

// POST /disasters/:id/analyze - Analyze disaster description
router.post('/:id/analyze', 
  requirePermission('read'),
  auditLog('analyze_disaster'),
  async (req, res) => {
    try {
      const { id } = req.params;
      
      const disasters = await getDisasters();
      const disaster = disasters.find(d => d.id === id);
      
      if (!disaster) {
        return res.status(404).json({
          error: 'Disaster not found',
          message: `No disaster found with ID: ${id}`
        });
      }

      // Analyze the disaster description
      const analysis = await geminiService.analyzeDisasterDescription(disaster.description);
      
      // Update disaster with analysis results
      const updates = {
        severity_level: analysis.severity_level,
        disaster_type: analysis.disaster_type,
        urgency_indicator: analysis.urgency_indicator,
        affected_areas: analysis.affected_areas,
        key_needs: analysis.key_needs,
        analyzed_at: new Date().toISOString()
      };

      await updateDisaster(id, updates);

      res.json({
        message: 'Disaster analyzed successfully',
        disaster_id: id,
        analysis
      });

    } catch (error) {
      logger.error('Error analyzing disaster:', error);
      res.status(500).json({
        error: 'Failed to analyze disaster',
        message: error.message
      });
    }
  }
);

module.exports = router; 