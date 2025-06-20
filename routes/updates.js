const express = require('express');
const router = express.Router();

// Import services and middleware
const officialUpdatesService = require('../services/officialUpdates');
const { 
  authenticateUser, 
  requirePermission, 
  auditLog, 
  userRateLimit 
} = require('../middleware/auth');
const { logger } = require('../utils/logger');

// Apply authentication to all routes
router.use(authenticateUser);
router.use(userRateLimit(60000, 30)); // 30 requests per minute per user (rate limiting for external APIs)

// GET /updates/:disasterId - Get official updates for a disaster
router.get('/:disasterId', 
  requirePermission('read'),
  auditLog('get_official_updates'),
  async (req, res) => {
    try {
      const { disasterId } = req.params;
      const { source, limit = 20, offset = 0 } = req.query;
      
      // Get location keywords from disaster (you might want to fetch this from the disaster record)
      const locationKeywords = []; // This would be populated from disaster data
      
      const updates = await officialUpdatesService.getOfficialUpdates(disasterId, locationKeywords);
      
      // Filter by source if specified
      let filteredUpdates = updates;
      if (source) {
        filteredUpdates = updates.filter(update => 
          update.source.toLowerCase() === source.toLowerCase()
        );
      }
      
      // Apply pagination
      const paginatedUpdates = filteredUpdates.slice(offset, offset + parseInt(limit));

      // Emit real-time update
      const io = req.app.get('io');
      io.to(`disaster-${disasterId}`).emit('official_updates_updated', {
        disaster_id: disasterId,
        updates: paginatedUpdates,
        timestamp: new Date().toISOString()
      });

      res.json({
        disaster_id: disasterId,
        updates: paginatedUpdates,
        pagination: {
          total: filteredUpdates.length,
          limit: parseInt(limit),
          offset: parseInt(offset),
          has_more: offset + parseInt(limit) < filteredUpdates.length
        },
        source_filter: source || 'all'
      });

    } catch (error) {
      logger.error('Error getting official updates:', error);
      res.status(500).json({
        error: 'Failed to get official updates',
        message: error.message
      });
    }
  }
);

// GET /updates/source/:source - Get updates from a specific source
router.get('/source/:source', 
  requirePermission('read'),
  auditLog('get_source_updates'),
  async (req, res) => {
    try {
      const { source } = req.params;
      const { limit = 20, offset = 0 } = req.query;
      
      const updates = await officialUpdatesService.getUpdatesBySource(source);
      
      // Apply pagination
      const paginatedUpdates = updates.slice(offset, offset + parseInt(limit));

      res.json({
        source,
        updates: paginatedUpdates,
        pagination: {
          total: updates.length,
          limit: parseInt(limit),
          offset: parseInt(offset),
          has_more: offset + parseInt(limit) < updates.length
        }
      });

    } catch (error) {
      logger.error('Error getting updates by source:', error);
      res.status(500).json({
        error: 'Failed to get updates by source',
        message: error.message
      });
    }
  }
);

// GET /updates/emergency-alerts - Get emergency alerts
router.get('/emergency-alerts', 
  requirePermission('read'),
  auditLog('get_emergency_alerts'),
  async (req, res) => {
    try {
      const { locationKeywords = [] } = req.query;
      const keywords = Array.isArray(locationKeywords) ? locationKeywords : locationKeywords.split(',').filter(k => k.trim());
      
      const alerts = await officialUpdatesService.getEmergencyAlerts(keywords);
      
      // Emit real-time update for emergency alerts
      const io = req.app.get('io');
      io.emit('emergency_alert', {
        alerts,
        location_keywords: keywords,
        timestamp: new Date().toISOString()
      });

      res.json({
        emergency_alerts: alerts,
        alert_count: alerts.length,
        location_keywords: keywords
      });

    } catch (error) {
      logger.error('Error getting emergency alerts:', error);
      res.status(500).json({
        error: 'Failed to get emergency alerts',
        message: error.message
      });
    }
  }
);

// POST /updates/:disasterId/simulate-updates - Simulate real-time official updates
router.post('/:disasterId/simulate-updates', 
  requirePermission('write'),
  auditLog('simulate_official_updates'),
  async (req, res) => {
    try {
      const { disasterId } = req.params;
      
      // Start simulation
      const updates = await officialUpdatesService.simulateRealTimeOfficialUpdates(disasterId, (update) => {
        const io = req.app.get('io');
        io.to(`disaster-${disasterId}`).emit('official_update_realtime', {
          disaster_id: disasterId,
          update,
          timestamp: new Date().toISOString()
        });
      });

      res.json({
        message: 'Official updates simulation started',
        disaster_id: disasterId,
        initial_updates: updates
      });

    } catch (error) {
      logger.error('Error starting official updates simulation:', error);
      res.status(500).json({
        error: 'Failed to start official updates simulation',
        message: error.message
      });
    }
  }
);

// GET /updates/sources/summary - Get summary by source
router.get('/sources/summary', 
  requirePermission('read'),
  auditLog('get_sources_summary'),
  async (req, res) => {
    try {
      const { disasterId } = req.query;
      
      if (!disasterId) {
        return res.status(400).json({
          error: 'Missing disaster ID',
          message: 'disasterId query parameter is required'
        });
      }

      const updates = await officialUpdatesService.getOfficialUpdates(disasterId);
      
      // Group by source
      const sourceSummary = updates.reduce((acc, update) => {
        const source = update.source;
        if (!acc[source]) {
          acc[source] = {
            source,
            total_updates: 0,
            recent_updates: [],
            latest_update: null
          };
        }
        
        acc[source].total_updates++;
        
        // Track latest update
        if (!acc[source].latest_update || new Date(update.date) > new Date(acc[source].latest_update.date)) {
          acc[source].latest_update = update;
        }
        
        // Add to recent updates (last 5)
        if (acc[source].recent_updates.length < 5) {
          acc[source].recent_updates.push({
            id: update.id,
            title: update.title,
            date: update.date,
            severity: update.severity || 'normal'
          });
        }
        
        return acc;
      }, {});

      res.json({
        disaster_id: disasterId,
        source_summary: Object.values(sourceSummary),
        total_updates: updates.length
      });

    } catch (error) {
      logger.error('Error getting sources summary:', error);
      res.status(500).json({
        error: 'Failed to get sources summary',
        message: error.message
      });
    }
  }
);

// GET /updates/mock-data - Get mock official updates data (for testing)
router.get('/mock-data', 
  requirePermission('read'),
  auditLog('get_mock_updates'),
  async (req, res) => {
    try {
      const { locationKeywords = [] } = req.query;
      const keywords = Array.isArray(locationKeywords) ? locationKeywords : locationKeywords.split(',').filter(k => k.trim());
      
      const mockUpdates = officialUpdatesService.getMockOfficialUpdates(keywords);
      
      res.json({
        updates: mockUpdates,
        total_count: mockUpdates.length,
        location_keywords: keywords,
        note: 'This is mock data for testing purposes'
      });

    } catch (error) {
      logger.error('Error getting mock updates:', error);
      res.status(500).json({
        error: 'Failed to get mock updates',
        message: error.message
      });
    }
  }
);

// POST /updates/refresh - Manually refresh all official updates
router.post('/refresh', 
  requirePermission('write'),
  auditLog('refresh_official_updates'),
  async (req, res) => {
    try {
      const { disasterId, locationKeywords = [] } = req.body;
      
      if (!disasterId) {
        return res.status(400).json({
          error: 'Missing disaster ID',
          message: 'disasterId is required'
        });
      }

      const keywords = Array.isArray(locationKeywords) ? locationKeywords : locationKeywords.split(',').filter(k => k.trim());
      
      // Force refresh by clearing cache and fetching new data
      const updates = await officialUpdatesService.getOfficialUpdates(disasterId, keywords);
      
      // Emit real-time update for refresh
      const io = req.app.get('io');
      io.to(`disaster-${disasterId}`).emit('official_updates_refreshed', {
        disaster_id: disasterId,
        updates,
        refreshed_by: req.user.username,
        timestamp: new Date().toISOString()
      });

      res.json({
        message: 'Official updates refreshed successfully',
        disaster_id: disasterId,
        updates,
        total_count: updates.length,
        location_keywords: keywords
      });

    } catch (error) {
      logger.error('Error refreshing official updates:', error);
      res.status(500).json({
        error: 'Failed to refresh official updates',
        message: error.message
      });
    }
  }
);

module.exports = router; 