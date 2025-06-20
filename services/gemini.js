const axios = require('axios');
const { logger } = require('../utils/logger');
const { getCachedData, setCachedData } = require('./supabase');

class GeminiService {
  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY;
    this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';
    this.visionUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro-vision:generateContent';
    
    // Check if API key is available
    if (!this.apiKey) {
      logger.warn('Gemini API key not set. Running in mock mode.');
      logger.warn('To use real Gemini API, set GEMINI_API_KEY in your .env file');
    }
  }

  async makeRequest(url, data) {
    // If no API key, return mock response
    if (!this.apiKey) {
      logger.info('Mock Gemini API request (no API key provided)');
      return {
        candidates: [{
          content: {
            parts: [{
              text: 'Mock response - API key not configured'
            }]
          }
        }]
      };
    }

    try {
      const response = await axios.post(`${url}?key=${this.apiKey}`, data, {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 30000, // 30 second timeout
      });

      return response.data;
    } catch (error) {
      logger.error('Gemini API request failed:', error.response?.data || error.message);
      throw new Error(`Gemini API error: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  async extractLocationFromText(text) {
    const cacheKey = `gemini_location_${Buffer.from(text).toString('base64').substring(0, 50)}`;
    
    // Check cache first
    const cachedResult = await getCachedData(cacheKey);
    if (cachedResult) {
      logger.info('Location extraction result retrieved from cache');
      return cachedResult;
    }

    const prompt = `Extract the specific location name from the following text. Return only the location name in a clear format (e.g., "Manhattan, NYC" or "Lower East Side, New York"). If no location is found, return "No location found".

Text: "${text}"

Location:`;

    const requestData = {
      contents: [{
        parts: [{
          text: prompt
        }]
      }],
      generationConfig: {
        temperature: 0.1,
        topK: 1,
        topP: 0.8,
        maxOutputTokens: 100,
      }
    };

    try {
      const response = await this.makeRequest(this.baseUrl, requestData);
      
      if (response.candidates && response.candidates[0] && response.candidates[0].content) {
        const location = response.candidates[0].content.parts[0].text.trim();
        
        // Cache the result
        await setCachedData(cacheKey, { location, source: 'gemini' });
        
        logger.info(`Location extracted: ${location}`);
        return { location, source: 'gemini' };
      } else {
        throw new Error('Invalid response format from Gemini API');
      }
    } catch (error) {
      logger.error('Failed to extract location from text:', error);
      return { location: 'No location found', source: 'error' };
    }
  }

  async verifyImageAuthenticity(imageUrl, disasterContext = '') {
    const cacheKey = `gemini_verification_${Buffer.from(imageUrl).toString('base64').substring(0, 50)}`;
    
    // Check cache first
    const cachedResult = await getCachedData(cacheKey);
    if (cachedResult) {
      logger.info('Image verification result retrieved from cache');
      return cachedResult;
    }

    const prompt = `Analyze this image for authenticity and disaster context. Consider the following:

1. Does the image appear to be authentic (not obviously manipulated or AI-generated)?
2. Does the image content match the disaster context: "${disasterContext}"?
3. Are there any signs of digital manipulation or inconsistencies?
4. Does the image show realistic disaster conditions?

Provide a structured response with:
- authenticity_score (0-100)
- manipulation_detected (true/false)
- context_match (true/false)
- confidence_level (low/medium/high)
- reasoning (brief explanation)

Format your response as valid JSON.`;

    const requestData = {
      contents: [{
        parts: [
          {
            text: prompt
          },
          {
            inline_data: {
              mime_type: "image/jpeg",
              data: await this.getImageAsBase64(imageUrl)
            }
          }
        ]
      }],
      generationConfig: {
        temperature: 0.1,
        topK: 1,
        topP: 0.8,
        maxOutputTokens: 500,
      }
    };

    try {
      const response = await this.makeRequest(this.visionUrl, requestData);
      
      if (response.candidates && response.candidates[0] && response.candidates[0].content) {
        const analysisText = response.candidates[0].content.parts[0].text.trim();
        
        // Try to parse JSON response
        let analysis;
        try {
          analysis = JSON.parse(analysisText);
        } catch (parseError) {
          // If JSON parsing fails, create a structured response
          analysis = {
            authenticity_score: 50,
            manipulation_detected: false,
            context_match: true,
            confidence_level: 'medium',
            reasoning: analysisText,
            raw_response: analysisText
          };
        }

        const result = {
          ...analysis,
          image_url: imageUrl,
          verified_at: new Date().toISOString(),
          source: 'gemini'
        };

        // Cache the result
        await setCachedData(cacheKey, result);
        
        logger.info(`Image verification completed for ${imageUrl}`);
        return result;
      } else {
        throw new Error('Invalid response format from Gemini Vision API');
      }
    } catch (error) {
      logger.error('Failed to verify image:', error);
      return {
        authenticity_score: 0,
        manipulation_detected: true,
        context_match: false,
        confidence_level: 'low',
        reasoning: 'Verification failed due to API error',
        image_url: imageUrl,
        verified_at: new Date().toISOString(),
        source: 'error'
      };
    }
  }

  async getImageAsBase64(imageUrl) {
    try {
      const response = await axios.get(imageUrl, {
        responseType: 'arraybuffer',
        timeout: 10000,
      });
      
      const buffer = Buffer.from(response.data, 'binary');
      return buffer.toString('base64');
    } catch (error) {
      logger.error('Failed to fetch image for verification:', error);
      throw new Error('Failed to fetch image for verification');
    }
  }

  async analyzeDisasterDescription(description) {
    const cacheKey = `gemini_analysis_${Buffer.from(description).toString('base64').substring(0, 50)}`;
    
    // Check cache first
    const cachedResult = await getCachedData(cacheKey);
    if (cachedResult) {
      return cachedResult;
    }

    const prompt = `Analyze this disaster description and extract key information:

Description: "${description}"

Provide a structured analysis with:
- severity_level (low/medium/high/critical)
- disaster_type (flood, earthquake, fire, hurricane, etc.)
- urgency_indicator (true/false)
- affected_areas (list of mentioned areas)
- key_needs (list of mentioned needs)

Format your response as valid JSON.`;

    const requestData = {
      contents: [{
        parts: [{
          text: prompt
        }]
      }],
      generationConfig: {
        temperature: 0.1,
        topK: 1,
        topP: 0.8,
        maxOutputTokens: 300,
      }
    };

    try {
      const response = await this.makeRequest(this.baseUrl, requestData);
      
      if (response.candidates && response.candidates[0] && response.candidates[0].content) {
        const analysisText = response.candidates[0].content.parts[0].text.trim();
        
        let analysis;
        try {
          analysis = JSON.parse(analysisText);
        } catch (parseError) {
          analysis = {
            severity_level: 'medium',
            disaster_type: 'unknown',
            urgency_indicator: false,
            affected_areas: [],
            key_needs: [],
            raw_response: analysisText
          };
        }

        const result = {
          ...analysis,
          analyzed_at: new Date().toISOString(),
          source: 'gemini'
        };

        // Cache the result
        await setCachedData(cacheKey, result);
        
        return result;
      } else {
        throw new Error('Invalid response format from Gemini API');
      }
    } catch (error) {
      logger.error('Failed to analyze disaster description:', error);
      return {
        severity_level: 'medium',
        disaster_type: 'unknown',
        urgency_indicator: false,
        affected_areas: [],
        key_needs: [],
        analyzed_at: new Date().toISOString(),
        source: 'error'
      };
    }
  }
}

module.exports = new GeminiService(); 