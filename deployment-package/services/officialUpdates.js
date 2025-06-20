const axios = require('axios');
const cheerio = require('cheerio');
const { logger } = require('../utils/logger');
const { getCachedData, setCachedData } = require('./supabase');

class OfficialUpdatesService {
  constructor() {
    this.sources = {
      fema: {
        url: 'https://www.fema.gov/disaster',
        name: 'FEMA',
        selectors: {
          container: '.disaster-list-item',
          title: 'h3',
          date: '.disaster-date',
          description: '.disaster-description',
          link: 'a'
        }
      },
      redCross: {
        url: 'https://www.redcross.org/get-help/disaster-relief-and-recovery-services.html',
        name: 'Red Cross',
        selectors: {
          container: '.disaster-update',
          title: '.update-title',
          date: '.update-date',
          description: '.update-content',
          link: '.update-link'
        }
      },
      weatherGov: {
        url: 'https://www.weather.gov/alerts',
        name: 'National Weather Service',
        selectors: {
          container: '.alert-item',
          title: '.alert-title',
          date: '.alert-time',
          description: '.alert-description',
          severity: '.alert-severity'
        }
      }
    };
  }

  async getOfficialUpdates(disasterId, locationKeywords = []) {
    const cacheKey = `official_updates_${disasterId}_${Buffer.from(locationKeywords.join(',')).toString('base64').substring(0, 30)}`;
    
    // Check cache first
    const cachedResult = await getCachedData(cacheKey);
    if (cachedResult) {
      logger.info('Official updates retrieved from cache');
      return cachedResult;
    }

    let allUpdates = [];

    // Fetch updates from multiple sources
    try {
      const femaUpdates = await this.scrapeFEMAUpdates(locationKeywords);
      allUpdates = allUpdates.concat(femaUpdates);
    } catch (error) {
      logger.warn('FEMA scraping failed:', error.message);
    }

    try {
      const redCrossUpdates = await this.scrapeRedCrossUpdates(locationKeywords);
      allUpdates = allUpdates.concat(redCrossUpdates);
    } catch (error) {
      logger.warn('Red Cross scraping failed:', error.message);
    }

    try {
      const weatherUpdates = await this.scrapeWeatherUpdates(locationKeywords);
      allUpdates = allUpdates.concat(weatherUpdates);
    } catch (error) {
      logger.warn('Weather service scraping failed:', error.message);
    }

    // If no real updates found, return mock data
    if (allUpdates.length === 0) {
      allUpdates = this.getMockOfficialUpdates(locationKeywords);
    }

    // Cache the results
    await setCachedData(cacheKey, allUpdates);
    
    return allUpdates;
  }

  async scrapeFEMAUpdates(locationKeywords) {
    try {
      const response = await axios.get(this.sources.fema.url, {
        timeout: 15000,
        headers: {
          'User-Agent': 'DisasterResponsePlatform/1.0'
        }
      });

      const $ = cheerio.load(response.data);
      const updates = [];

      $(this.sources.fema.selectors.container).each((index, element) => {
        const title = $(element).find(this.sources.fema.selectors.title).text().trim();
        const date = $(element).find(this.sources.fema.selectors.date).text().trim();
        const description = $(element).find(this.sources.fema.selectors.description).text().trim();
        const link = $(element).find(this.sources.fema.selectors.link).attr('href');

        // Filter by location keywords if provided
        if (locationKeywords.length === 0 || 
            locationKeywords.some(keyword => 
              (title + ' ' + description).toLowerCase().includes(keyword.toLowerCase())
            )) {
          updates.push({
            id: `fema_${index}`,
            source: 'FEMA',
            title,
            date,
            description,
            url: link ? `https://www.fema.gov${link}` : null,
            scraped_at: new Date().toISOString()
          });
        }
      });

      return updates;
    } catch (error) {
      logger.error('Error scraping FEMA updates:', error);
      return [];
    }
  }

  async scrapeRedCrossUpdates(locationKeywords) {
    try {
      const response = await axios.get(this.sources.redCross.url, {
        timeout: 15000,
        headers: {
          'User-Agent': 'DisasterResponsePlatform/1.0'
        }
      });

      const $ = cheerio.load(response.data);
      const updates = [];

      $(this.sources.redCross.selectors.container).each((index, element) => {
        const title = $(element).find(this.sources.redCross.selectors.title).text().trim();
        const date = $(element).find(this.sources.redCross.selectors.date).text().trim();
        const description = $(element).find(this.sources.redCross.selectors.description).text().trim();
        const link = $(element).find(this.sources.redCross.selectors.link).attr('href');

        if (locationKeywords.length === 0 || 
            locationKeywords.some(keyword => 
              (title + ' ' + description).toLowerCase().includes(keyword.toLowerCase())
            )) {
          updates.push({
            id: `redcross_${index}`,
            source: 'Red Cross',
            title,
            date,
            description,
            url: link,
            scraped_at: new Date().toISOString()
          });
        }
      });

      return updates;
    } catch (error) {
      logger.error('Error scraping Red Cross updates:', error);
      return [];
    }
  }

  async scrapeWeatherUpdates(locationKeywords) {
    try {
      const response = await axios.get(this.sources.weatherGov.url, {
        timeout: 15000,
        headers: {
          'User-Agent': 'DisasterResponsePlatform/1.0'
        }
      });

      const $ = cheerio.load(response.data);
      const updates = [];

      $(this.sources.weatherGov.selectors.container).each((index, element) => {
        const title = $(element).find(this.sources.weatherGov.selectors.title).text().trim();
        const date = $(element).find(this.sources.weatherGov.selectors.date).text().trim();
        const description = $(element).find(this.sources.weatherGov.selectors.description).text().trim();
        const severity = $(element).find(this.sources.weatherGov.selectors.severity).text().trim();

        if (locationKeywords.length === 0 || 
            locationKeywords.some(keyword => 
              (title + ' ' + description).toLowerCase().includes(keyword.toLowerCase())
            )) {
          updates.push({
            id: `weather_${index}`,
            source: 'National Weather Service',
            title,
            date,
            description,
            severity,
            scraped_at: new Date().toISOString()
          });
        }
      });

      return updates;
    } catch (error) {
      logger.error('Error scraping weather updates:', error);
      return [];
    }
  }

  getMockOfficialUpdates(locationKeywords) {
    const location = locationKeywords[0] || 'Manhattan';
    
    return [
      {
        id: 'fema_mock_1',
        source: 'FEMA',
        title: `Federal Disaster Declaration for ${location}`,
        date: new Date().toISOString(),
        description: `President has declared a major disaster for ${location} area. Federal assistance is now available for individuals and businesses affected by the flooding.`,
        url: 'https://www.fema.gov/disaster/mock-disaster',
        scraped_at: new Date().toISOString()
      },
      {
        id: 'redcross_mock_1',
        source: 'Red Cross',
        title: `Emergency Shelter Operations in ${location}`,
        date: new Date(Date.now() - 3600000).toISOString(),
        description: `Red Cross has opened emergency shelters in ${location} to assist displaced residents. Medical services and food distribution available.`,
        url: 'https://www.redcross.org/shelter-updates',
        scraped_at: new Date().toISOString()
      },
      {
        id: 'weather_mock_1',
        source: 'National Weather Service',
        title: `Flood Warning Extended for ${location}`,
        date: new Date(Date.now() - 7200000).toISOString(),
        description: `Flood warning remains in effect for ${location} until further notice. Water levels continue to rise in affected areas.`,
        severity: 'Warning',
        scraped_at: new Date().toISOString()
      },
      {
        id: 'fema_mock_2',
        source: 'FEMA',
        title: 'Disaster Recovery Centers Opening',
        date: new Date(Date.now() - 10800000).toISOString(),
        description: 'FEMA Disaster Recovery Centers will open in affected areas to provide in-person assistance with disaster relief applications.',
        url: 'https://www.fema.gov/recovery-centers',
        scraped_at: new Date().toISOString()
      },
      {
        id: 'redcross_mock_2',
        source: 'Red Cross',
        title: 'Volunteer Training Sessions',
        date: new Date(Date.now() - 14400000).toISOString(),
        description: 'Red Cross is conducting emergency volunteer training sessions for disaster response. Contact local chapter for registration.',
        url: 'https://www.redcross.org/volunteer',
        scraped_at: new Date().toISOString()
      }
    ];
  }

  async getUpdatesBySource(source) {
    const cacheKey = `official_updates_source_${source}`;
    
    const cachedResult = await getCachedData(cacheKey);
    if (cachedResult) {
      return cachedResult;
    }

    let updates = [];
    
    switch (source.toLowerCase()) {
      case 'fema':
        updates = await this.scrapeFEMAUpdates();
        break;
      case 'redcross':
        updates = await this.scrapeRedCrossUpdates();
        break;
      case 'weather':
        updates = await this.scrapeWeatherUpdates();
        break;
      default:
        updates = this.getMockOfficialUpdates();
    }

    await setCachedData(cacheKey, updates);
    return updates;
  }

  async getEmergencyAlerts(locationKeywords = []) {
    const allUpdates = await this.getOfficialUpdates('emergency_alerts', locationKeywords);
    
    // Filter for emergency-level updates
    return allUpdates.filter(update => {
      const content = (update.title + ' ' + update.description).toLowerCase();
      const emergencyKeywords = ['emergency', 'warning', 'evacuation', 'critical', 'immediate'];
      return emergencyKeywords.some(keyword => content.includes(keyword));
    });
  }

  // Simulate real-time official updates
  async simulateRealTimeOfficialUpdates(disasterId, callback) {
    const mockRealTimeUpdates = [
      {
        id: `official_realtime_${Date.now()}`,
        source: 'FEMA',
        title: 'Emergency Response Team Deployed',
        date: new Date().toISOString(),
        description: 'Federal emergency response teams have been deployed to the affected area.',
        priority: 'high'
      }
    ];

    // Simulate real-time updates every 60 seconds
    setInterval(() => {
      const update = mockRealTimeUpdates[Math.floor(Math.random() * mockRealTimeUpdates.length)];
      if (callback) {
        callback(update);
      }
    }, 60000);

    return mockRealTimeUpdates;
  }
}

module.exports = new OfficialUpdatesService(); 