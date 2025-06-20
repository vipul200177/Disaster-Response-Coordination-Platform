const express = require('express');
const router = express.Router();

// Import services and middleware
const geminiService = require('../services/gemini');
const geocodingService = require('../services/geocoding');
const { 
  authenticateUser, 
  requirePermission, 
  auditLog, 
  userRateLimit 
} = require('../middleware/auth');
const { logger, logGeocodingRequest } = require('../utils/logger');

// Apply authentication to all routes
router.use(authenticateUser);
router.use(userRateLimit(60000, 50)); // 50 requests per minute per user

// POST /geocoding/extract-location - Extract location from text using Gemini
router.post('/extract-location', 
  requirePermission('read'),
  auditLog('extract_location'),
  async (req, res) => {
    try {
      const { text } = req.body;
      
      if (!text) {
        return res.status(400).json({
          error: 'Missing required field',
          message: 'text is required'
        });
      }

      // Extract location using Gemini API
      const locationResult = await geminiService.extractLocationFromText(text);
      
      logGeocodingRequest(locationResult.location, null, locationResult.location !== 'No location found');

      res.json({
        original_text: text,
        extracted_location: locationResult.location,
        source: locationResult.source
      });

    } catch (error) {
      logger.error('Error extracting location:', error);
      res.status(500).json({
        error: 'Failed to extract location',
        message: error.message
      });
    }
  }
);

// POST /geocoding/geocode - Convert location name to coordinates
router.post('/geocode', 
  requirePermission('read'),
  auditLog('geocode_location'),
  async (req, res) => {
    try {
      const { location_name } = req.body;
      
      if (!location_name) {
        return res.status(400).json({
          error: 'Missing required field',
          message: 'location_name is required'
        });
      }

      // Geocode the location
      const geocodeResult = await geocodingService.geocodeLocation(location_name);
      
      logGeocodingRequest(location_name, geocodeResult.coordinates, !!geocodeResult.coordinates);

      res.json({
        location_name,
        geocoding_result: geocodeResult
      });

    } catch (error) {
      logger.error('Error geocoding location:', error);
      res.status(500).json({
        error: 'Failed to geocode location',
        message: error.message
      });
    }
  }
);

module.exports = router; 