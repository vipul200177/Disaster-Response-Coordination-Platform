const express = require('express');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();

// Import services and middleware
const { 
  createResource, 
  getResourcesByDisaster, 
  findNearbyResources 
} = require('../services/supabase');
const geocodingService = require('../services/geocoding');
const { 
  authenticateUser, 
  requirePermission, 
  auditLog, 
  userRateLimit 
} = require('../middleware/auth');
const { logger, logResourceMapped } = require('../utils/logger');

// Apply authentication to all routes
router.use(authenticateUser);
router.use(userRateLimit(60000, 100)); // 100 requests per minute per user

// POST /resources - Create a new resource
router.post('/', 
  requirePermission('write'),
  auditLog('create_resource'),
  async (req, res) => {
    try {
      const { disaster_id, name, location_name, type, capacity, contact_info } = req.body;
      
      if (!disaster_id || !name || !location_name || !type) {
        return res.status(400).json({
          error: 'Missing required fields',
          message: 'disaster_id, name, location_name, and type are required'
        });
      }

      // Geocode the location
      let coordinates = null;
      const geocodeResult = await geocodingService.geocodeLocation(location_name);
      coordinates = geocodeResult.coordinates;
      
      if (coordinates) {
        logger.info(`Resource location geocoded: ${location_name} -> ${JSON.stringify(coordinates)}`);
      }

      // Create resource record
      const resourceData = {
        id: uuidv4(),
        disaster_id,
        name,
        location_name,
        location: coordinates ? `POINT(${coordinates.longitude} ${coordinates.latitude})` : null,
        type,
        capacity: capacity || null,
        contact_info: contact_info || null,
        created_at: new Date().toISOString(),
        created_by: req.user.id
      };

      const resource = await createResource(resourceData);
      
      // Emit real-time update
      const io = req.app.get('io');
      io.to(`disaster-${disaster_id}`).emit('resource_created', {
        disaster_id,
        resource,
        created_by: req.user.username,
        timestamp: new Date().toISOString()
      });

      logResourceMapped(name, location_name, disaster_id);

      res.status(201).json({
        message: 'Resource created successfully',
        resource,
        geocoding: {
          location_name,
          coordinates,
          source: geocodeResult.source
        }
      });

    } catch (error) {
      logger.error('Error creating resource:', error);
      res.status(500).json({
        error: 'Failed to create resource',
        message: error.message
      });
    }
  }
);

// GET /resources/:disasterId - Get resources for a specific disaster
router.get('/:disasterId', 
  requirePermission('read'),
  auditLog('get_resources'),
  async (req, res) => {
    try {
      const { disasterId } = req.params;
      const { type, limit = 50, offset = 0 } = req.query;
      
      const resources = await getResourcesByDisaster(disasterId);
      
      // Filter by type if specified
      let filteredResources = resources;
      if (type) {
        filteredResources = resources.filter(resource => resource.type === type);
      }
      
      // Apply pagination
      const paginatedResources = (filteredResources || []).slice(offset, offset + parseInt(limit));

      // Broadcast WebSocket event for resource updates
      const io = req.app.get('io');
      io.emit('resources_updated', { 
        disasterId, 
        resources: paginatedResources,
        timestamp: new Date().toISOString()
      });

      res.json({
        disaster_id: disasterId,
        resources: paginatedResources,
        pagination: {
          total: filteredResources.length,
          limit: parseInt(limit),
          offset: parseInt(offset),
          has_more: offset + parseInt(limit) < filteredResources.length
        },
        type_filter: type || 'all'
      });

    } catch (error) {
      logger.error('Error getting resources:', error);
      res.status(500).json({
        error: 'Failed to get resources',
        message: error.message
      });
    }
  }
);

// GET /resources/:disasterId/nearby - Find nearby resources using geospatial queries
router.get('/:disasterId/nearby', 
  requirePermission('read'),
  auditLog('get_nearby_resources'),
  async (req, res) => {
    try {
      const { disasterId } = req.params;
      const { lat, lon, radius = 10, type } = req.query;
      
      if (!lat || !lon) {
        return res.status(400).json({
          error: 'Missing coordinates',
          message: 'lat and lon query parameters are required'
        });
      }

      const latitude = parseFloat(lat);
      const longitude = parseFloat(lon);
      const radiusKm = parseFloat(radius);

      // Validate coordinates
      if (!geocodingService.isValidCoordinates(latitude, longitude)) {
        return res.status(400).json({
          error: 'Invalid coordinates',
          message: 'Latitude must be between -90 and 90, longitude between -180 and 180'
        });
      }

      // Find nearby resources using geospatial query
      const nearbyResources = await findNearbyResources(latitude, longitude, radiusKm);
      
      // Filter by type if specified
      let filteredResources = nearbyResources;
      if (type) {
        filteredResources = nearbyResources.filter(resource => resource.type === type);
      }

      // Add distance information to each resource
      const resourcesWithDistance = filteredResources.map(resource => {
        if (resource.location) {
          const [resourceLon, resourceLat] = resource.location.replace('POINT(', '').replace(')', '').split(' ');
          const distance = geocodingService.calculateDistance(
            latitude, longitude, 
            parseFloat(resourceLat), parseFloat(resourceLon)
          );
          return {
            ...resource,
            distance_km: Math.round(distance * 100) / 100
          };
        }
        return resource;
      });

      // Sort by distance
      resourcesWithDistance.sort((a, b) => (a.distance_km || 0) - (b.distance_km || 0));

      // Emit real-time update
      const io = req.app.get('io');
      io.to(`disaster-${disasterId}`).emit('nearby_resources_updated', {
        disaster_id: disasterId,
        search_location: { latitude, longitude },
        radius_km: radiusKm,
        resources: resourcesWithDistance,
        timestamp: new Date().toISOString()
      });

      res.json({
        disaster_id: disasterId,
        search_location: { latitude, longitude },
        radius_km: radiusKm,
        resources: resourcesWithDistance,
        total_count: resourcesWithDistance.length,
        type_filter: type || 'all'
      });

    } catch (error) {
      logger.error('Error finding nearby resources:', error);
      res.status(500).json({
        error: 'Failed to find nearby resources',
        message: error.message
      });
    }
  }
);

// GET /resources/types/summary - Get resource summary by type
router.get('/types/summary', 
  requirePermission('read'),
  auditLog('get_resource_summary'),
  async (req, res) => {
    try {
      const { disasterId } = req.query;
      
      if (!disasterId) {
        return res.status(400).json({
          error: 'Missing disaster ID',
          message: 'disasterId query parameter is required'
        });
      }

      const resources = await getResourcesByDisaster(disasterId);
      
      // Group by type
      const typeSummary = resources.reduce((acc, resource) => {
        const type = resource.type;
        if (!acc[type]) {
          acc[type] = {
            type,
            total_count: 0,
            total_capacity: 0,
            locations: new Set(),
            recent_resources: []
          };
        }
        
        acc[type].total_count++;
        if (resource.capacity) {
          acc[type].total_capacity += parseInt(resource.capacity) || 0;
        }
        acc[type].locations.add(resource.location_name);
        
        // Add to recent resources (last 5)
        if (acc[type].recent_resources.length < 5) {
          acc[type].recent_resources.push({
            id: resource.id,
            name: resource.name,
            location_name: resource.location_name,
            created_at: resource.created_at
          });
        }
        
        return acc;
      }, {});

      // Convert sets to arrays
      Object.values(typeSummary).forEach(summary => {
        summary.locations = Array.from(summary.locations);
      });

      res.json({
        disaster_id: disasterId,
        type_summary: Object.values(typeSummary),
        total_resources: resources.length
      });

    } catch (error) {
      logger.error('Error getting resource summary:', error);
      res.status(500).json({
        error: 'Failed to get resource summary',
        message: error.message
      });
    }
  }
);

// POST /resources/:disasterId/bulk-create - Create multiple resources at once
router.post('/:disasterId/bulk-create', 
  requirePermission('write'),
  auditLog('bulk_create_resources'),
  async (req, res) => {
    try {
      const { disasterId } = req.params;
      const { resources } = req.body;
      
      if (!Array.isArray(resources) || resources.length === 0) {
        return res.status(400).json({
          error: 'Invalid resources data',
          message: 'resources must be a non-empty array'
        });
      }

      const createdResources = [];
      const errors = [];

      for (const resourceData of resources) {
        try {
          const { name, location_name, type, capacity, contact_info } = resourceData;
          
          if (!name || !location_name || !type) {
            errors.push({
              resource: resourceData,
              error: 'Missing required fields: name, location_name, type'
            });
            continue;
          }

          // Geocode the location
          const geocodeResult = await geocodingService.geocodeLocation(location_name);
          const coordinates = geocodeResult.coordinates;

          const resource = {
            id: uuidv4(),
            disaster_id: disasterId,
            name,
            location_name,
            location: coordinates ? `POINT(${coordinates.longitude} ${coordinates.latitude})` : null,
            type,
            capacity: capacity || null,
            contact_info: contact_info || null,
            created_at: new Date().toISOString(),
            created_by: req.user.id
          };

          const createdResource = await createResource(resource);
          createdResources.push(createdResource);
          
          logResourceMapped(name, location_name, disasterId);

        } catch (error) {
          errors.push({
            resource: resourceData,
            error: error.message
          });
        }
      }

      // Emit real-time update for bulk creation
      const io = req.app.get('io');
      io.to(`disaster-${disasterId}`).emit('resources_bulk_created', {
        disaster_id: disasterId,
        created_count: createdResources.length,
        error_count: errors.length,
        created_by: req.user.username,
        timestamp: new Date().toISOString()
      });

      res.status(201).json({
        message: 'Bulk resource creation completed',
        disaster_id: disasterId,
        created_resources: createdResources,
        created_count: createdResources.length,
        errors,
        error_count: errors.length
      });

    } catch (error) {
      logger.error('Error in bulk resource creation:', error);
      res.status(500).json({
        error: 'Failed to create resources in bulk',
        message: error.message
      });
    }
  }
);

// GET /resources/mock-data - Get mock resource data (for testing)
router.get('/mock-data', 
  requirePermission('read'),
  auditLog('get_mock_resources'),
  async (req, res) => {
    try {
      const mockResources = [
        {
          id: 'mock_resource_1',
          disaster_id: 'mock_disaster_1',
          name: 'Red Cross Emergency Shelter',
          location_name: 'Lower East Side, NYC',
          type: 'shelter',
          capacity: 200,
          contact_info: '555-0123',
          created_at: new Date().toISOString()
        },
        {
          id: 'mock_resource_2',
          disaster_id: 'mock_disaster_1',
          name: 'Bellevue Hospital Emergency Room',
          location_name: 'Manhattan, NYC',
          type: 'medical',
          capacity: 50,
          contact_info: '555-0124',
          created_at: new Date(Date.now() - 3600000).toISOString()
        },
        {
          id: 'mock_resource_3',
          disaster_id: 'mock_disaster_1',
          name: 'Food Distribution Center',
          location_name: 'Central Park, NYC',
          type: 'food',
          capacity: 500,
          contact_info: '555-0125',
          created_at: new Date(Date.now() - 7200000).toISOString()
        },
        {
          id: 'mock_resource_4',
          disaster_id: 'mock_disaster_1',
          name: 'Emergency Water Supply',
          location_name: 'Brooklyn Bridge Park',
          type: 'water',
          capacity: 1000,
          contact_info: '555-0126',
          created_at: new Date(Date.now() - 10800000).toISOString()
        }
      ];

      res.json({
        resources: mockResources,
        total_count: mockResources.length,
        note: 'This is mock data for testing purposes'
      });

    } catch (error) {
      logger.error('Error getting mock resources:', error);
      res.status(500).json({
        error: 'Failed to get mock resources',
        message: error.message
      });
    }
  }
);

module.exports = router; 