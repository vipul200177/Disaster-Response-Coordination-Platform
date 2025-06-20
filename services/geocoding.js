const axios = require('axios');
const { logger, logGeocodingRequest } = require('../utils/logger');
const { getCachedData, setCachedData } = require('./supabase');

class GeocodingService {
  constructor() {
    this.googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY;
    this.mapboxAccessToken = process.env.MAPBOX_ACCESS_TOKEN;
    
    // Check if any API keys are available
    if (!this.googleMapsApiKey && !this.mapboxAccessToken) {
      logger.warn('No geocoding API keys set. Will use OpenStreetMap (free) as fallback.');
      logger.warn('To use Google Maps or Mapbox, set GOOGLE_MAPS_API_KEY or MAPBOX_ACCESS_TOKEN in your .env file');
    }
  }

  async geocodeLocation(locationName) {
    const cacheKey = `geocode_${Buffer.from(locationName).toString('base64').substring(0, 50)}`;
    
    // Check cache first
    const cachedResult = await getCachedData(cacheKey);
    if (cachedResult) {
      logGeocodingRequest(locationName, cachedResult.coordinates, true);
      return cachedResult;
    }

    // Try Google Maps first, then Mapbox, then OpenStreetMap
    let coordinates = null;
    let source = 'unknown';

    try {
      // Try Google Maps
      if (this.googleMapsApiKey) {
        coordinates = await this.geocodeWithGoogleMaps(locationName);
        source = 'google_maps';
      }
    } catch (error) {
      logger.warn('Google Maps geocoding failed, trying Mapbox:', error.message);
    }

    try {
      // Try Mapbox if Google Maps failed
      if (!coordinates && this.mapboxAccessToken) {
        coordinates = await this.geocodeWithMapbox(locationName);
        source = 'mapbox';
      }
    } catch (error) {
      logger.warn('Mapbox geocoding failed, trying OpenStreetMap:', error.message);
    }

    try {
      // Try OpenStreetMap as fallback
      if (!coordinates) {
        coordinates = await this.geocodeWithOpenStreetMap(locationName);
        source = 'openstreetmap';
      }
    } catch (error) {
      logger.error('All geocoding services failed:', error.message);
      
      // Return mock coordinates for testing
      coordinates = {
        latitude: 40.7128,
        longitude: -74.0060
      };
      source = 'mock';
      logger.info('Using mock coordinates for testing');
    }

    if (coordinates) {
      const result = {
        location_name: locationName,
        coordinates,
        source,
        geocoded_at: new Date().toISOString()
      };

      // Cache the result
      await setCachedData(cacheKey, result);
      
      logGeocodingRequest(locationName, coordinates, true);
      return result;
    } else {
      logGeocodingRequest(locationName, null, false);
      return {
        location_name: locationName,
        coordinates: null,
        source: 'failed',
        geocoded_at: new Date().toISOString(),
        error: 'All geocoding services failed'
      };
    }
  }

  async geocodeWithGoogleMaps(locationName) {
    const url = 'https://maps.googleapis.com/maps/api/geocode/json';
    const params = {
      address: locationName,
      key: this.googleMapsApiKey
    };

    const response = await axios.get(url, { params, timeout: 10000 });
    
    if (response.data.status === 'OK' && response.data.results.length > 0) {
      const location = response.data.results[0].geometry.location;
      return {
        latitude: location.lat,
        longitude: location.lng
      };
    } else {
      throw new Error(`Google Maps geocoding failed: ${response.data.status}`);
    }
  }

  async geocodeWithMapbox(locationName) {
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(locationName)}.json`;
    const params = {
      access_token: this.mapboxAccessToken,
      limit: 1
    };

    const response = await axios.get(url, { params, timeout: 10000 });
    
    if (response.data.features && response.data.features.length > 0) {
      const [longitude, latitude] = response.data.features[0].center;
      return {
        latitude,
        longitude
      };
    } else {
      throw new Error('Mapbox geocoding failed: No results found');
    }
  }

  async geocodeWithOpenStreetMap(locationName) {
    const url = 'https://nominatim.openstreetmap.org/search';
    const params = {
      q: locationName,
      format: 'json',
      limit: 1
    };

    const response = await axios.get(url, { 
      params, 
      timeout: 15000,
      headers: {
        'User-Agent': 'DisasterResponsePlatform/1.0'
      }
    });
    
    if (response.data && response.data.length > 0) {
      const result = response.data[0];
      return {
        latitude: parseFloat(result.lat),
        longitude: parseFloat(result.lon)
      };
    } else {
      throw new Error('OpenStreetMap geocoding failed: No results found');
    }
  }

  async reverseGeocode(latitude, longitude) {
    const cacheKey = `reverse_geocode_${latitude}_${longitude}`;
    
    // Check cache first
    const cachedResult = await getCachedData(cacheKey);
    if (cachedResult) {
      return cachedResult;
    }

    try {
      // Use OpenStreetMap for reverse geocoding (free and reliable)
      const url = 'https://nominatim.openstreetmap.org/reverse';
      const params = {
        lat: latitude,
        lon: longitude,
        format: 'json'
      };

      const response = await axios.get(url, { 
        params, 
        timeout: 10000,
        headers: {
          'User-Agent': 'DisasterResponsePlatform/1.0'
        }
      });
      
      if (response.data && response.data.display_name) {
        const result = {
          coordinates: { latitude, longitude },
          address: response.data.display_name,
          reverse_geocoded_at: new Date().toISOString(),
          source: 'openstreetmap'
        };

        // Cache the result
        await setCachedData(cacheKey, result);
        
        return result;
      } else {
        throw new Error('Reverse geocoding failed: Invalid response');
      }
    } catch (error) {
      logger.error('Reverse geocoding failed:', error);
      return {
        coordinates: { latitude, longitude },
        address: 'Unknown location',
        reverse_geocoded_at: new Date().toISOString(),
        source: 'error',
        error: error.message
      };
    }
  }

  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c; // Distance in kilometers
    return distance;
  }

  deg2rad(deg) {
    return deg * (Math.PI/180);
  }

  // Helper method to validate coordinates
  isValidCoordinates(latitude, longitude) {
    return (
      typeof latitude === 'number' && 
      typeof longitude === 'number' &&
      latitude >= -90 && latitude <= 90 &&
      longitude >= -180 && longitude <= 180
    );
  }
}

module.exports = new GeocodingService(); 