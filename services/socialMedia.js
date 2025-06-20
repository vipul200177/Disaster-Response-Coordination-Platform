const axios = require('axios');
const { logger, logSocialMediaProcessed } = require('../utils/logger');
const { getCachedData, setCachedData } = require('./supabase');

class SocialMediaService {
  constructor() {
    this.twitterBearerToken = process.env.TWITTER_BEARER_TOKEN;
    this.blueskyIdentifier = process.env.BLUESKY_IDENTIFIER;
    this.blueskyPassword = process.env.BLUESKY_PASSWORD;
  }

  async getSocialMediaReports(disasterId, keywords = []) {
    const cacheKey = `social_media_${disasterId}_${Buffer.from(keywords.join(',')).toString('base64').substring(0, 30)}`;
    
    // Check cache first
    const cachedResult = await getCachedData(cacheKey);
    if (cachedResult) {
      logSocialMediaProcessed('cached', disasterId, cachedResult.length);
      return cachedResult;
    }

    let reports = [];

    // Try real Twitter API first
    try {
      if (this.twitterBearerToken) {
        const twitterReports = await this.getTwitterReports(keywords);
        reports = reports.concat(twitterReports);
        logSocialMediaProcessed('twitter', disasterId, twitterReports.length);
      }
    } catch (error) {
      logger.warn('Twitter API failed, falling back to mock data:', error.message);
    }

    // Try Bluesky API
    try {
      if (this.blueskyIdentifier && this.blueskyPassword) {
        const blueskyReports = await this.getBlueskyReports(keywords);
        reports = reports.concat(blueskyReports);
        logSocialMediaProcessed('bluesky', disasterId, blueskyReports.length);
      }
    } catch (error) {
      logger.warn('Bluesky API failed:', error.message);
    }

    // Fallback to mock data if no real APIs work
    if (reports.length === 0) {
      reports = this.getMockSocialMediaReports(keywords);
      logSocialMediaProcessed('mock', disasterId, reports.length);
    }

    // Cache the results
    await setCachedData(cacheKey, reports);
    
    return reports;
  }

  async getTwitterReports(keywords) {
    if (!this.twitterBearerToken) {
      throw new Error('Twitter Bearer Token not configured');
    }

    const query = keywords.map(keyword => `"${keyword}"`).join(' OR ');
    const url = 'https://api.twitter.com/2/tweets/search/recent';
    const params = {
      query: `${query} -is:retweet`,
      max_results: 50,
      'tweet.fields': 'created_at,author_id,text,public_metrics',
      'user.fields': 'username,name'
    };

    const response = await axios.get(url, {
      params,
      headers: {
        'Authorization': `Bearer ${this.twitterBearerToken}`,
        'User-Agent': 'DisasterResponsePlatform/1.0'
      },
      timeout: 15000
    });

    if (response.data && response.data.data) {
      return response.data.data.map(tweet => ({
        id: tweet.id,
        platform: 'twitter',
        content: tweet.text,
        author: tweet.author_id,
        created_at: tweet.created_at,
        metrics: tweet.public_metrics,
        url: `https://twitter.com/user/status/${tweet.id}`,
        priority: this.calculatePriority(tweet.text, tweet.public_metrics)
      }));
    }

    return [];
  }

  async getBlueskyReports(keywords) {
    if (!this.blueskyIdentifier || !this.blueskyPassword) {
      throw new Error('Bluesky credentials not configured');
    }

    // Note: This is a simplified implementation
    // Real Bluesky API integration would require more complex authentication
    const query = keywords.join(' ');
    const url = 'https://bsky.social/xrpc/app.bsky.feed.searchPosts';
    const params = {
      q: query,
      limit: 50
    };

    try {
      const response = await axios.get(url, {
        params,
        timeout: 15000
      });

      if (response.data && response.data.posts) {
        return response.data.posts.map(post => ({
          id: post.uri,
          platform: 'bluesky',
          content: post.record.text,
          author: post.author.handle,
          created_at: post.indexedAt,
          url: `https://bsky.app/profile/${post.author.handle}/post/${post.uri.split('/').pop()}`,
          priority: this.calculatePriority(post.record.text, { likeCount: post.likeCount || 0 })
        }));
      }
    } catch (error) {
      logger.error('Bluesky API error:', error);
    }

    return [];
  }

  getMockSocialMediaReports(keywords) {
    const mockReports = [
      {
        id: 'mock_1',
        platform: 'twitter',
        content: `#floodrelief Need immediate assistance in ${keywords[0] || 'Manhattan'}. Water levels rising rapidly.`,
        author: 'citizen1',
        created_at: new Date().toISOString(),
        url: 'https://twitter.com/citizen1/status/mock_1',
        priority: 'high',
        metrics: { retweet_count: 45, like_count: 123 }
      },
      {
        id: 'mock_2',
        platform: 'twitter',
        content: `Emergency shelter needed in ${keywords[0] || 'Lower East Side'}. Families with children. #disasterresponse`,
        author: 'relief_worker',
        created_at: new Date(Date.now() - 300000).toISOString(),
        url: 'https://twitter.com/relief_worker/status/mock_2',
        priority: 'urgent',
        metrics: { retweet_count: 89, like_count: 234 }
      },
      {
        id: 'mock_3',
        platform: 'bluesky',
        content: `Medical supplies running low at ${keywords[0] || 'downtown'} shelter. Need volunteers and donations.`,
        author: 'medical_team',
        created_at: new Date(Date.now() - 600000).toISOString(),
        url: 'https://bsky.app/profile/medical_team/post/mock_3',
        priority: 'high',
        metrics: { like_count: 67 }
      },
      {
        id: 'mock_4',
        platform: 'twitter',
        content: `Power restored in ${keywords[0] || 'Midtown'}. Communication lines back up. #recovery`,
        author: 'utility_company',
        created_at: new Date(Date.now() - 900000).toISOString(),
        url: 'https://twitter.com/utility_company/status/mock_4',
        priority: 'medium',
        metrics: { retweet_count: 23, like_count: 89 }
      },
      {
        id: 'mock_5',
        platform: 'bluesky',
        content: `Food distribution center opening at ${keywords[0] || 'Central Park'}. Bring ID for families in need.`,
        author: 'red_cross_nyc',
        created_at: new Date(Date.now() - 1200000).toISOString(),
        url: 'https://bsky.app/profile/red_cross_nyc/post/mock_5',
        priority: 'medium',
        metrics: { like_count: 156 }
      }
    ];

    // Filter by keywords if provided
    if (keywords.length > 0) {
      return mockReports.filter(report => 
        keywords.some(keyword => 
          report.content.toLowerCase().includes(keyword.toLowerCase())
        )
      );
    }

    return mockReports;
  }

  calculatePriority(content, metrics = {}) {
    const urgentKeywords = ['urgent', 'emergency', 'sos', 'immediate', 'critical', 'help'];
    const highKeywords = ['need', 'assistance', 'shelter', 'medical', 'food', 'water'];
    
    const contentLower = content.toLowerCase();
    
    // Check for urgent keywords
    if (urgentKeywords.some(keyword => contentLower.includes(keyword))) {
      return 'urgent';
    }
    
    // Check for high priority keywords
    if (highKeywords.some(keyword => contentLower.includes(keyword))) {
      return 'high';
    }
    
    // Check engagement metrics
    const totalEngagement = (metrics.retweet_count || 0) + (metrics.like_count || 0);
    if (totalEngagement > 100) {
      return 'high';
    } else if (totalEngagement > 50) {
      return 'medium';
    }
    
    return 'low';
  }

  async getPriorityAlerts(disasterId) {
    const allReports = await this.getSocialMediaReports(disasterId);
    return allReports.filter(report => 
      report.priority === 'urgent' || report.priority === 'high'
    );
  }

  async getReportsByLocation(locationKeywords) {
    const reports = await this.getSocialMediaReports('location_search', locationKeywords);
    return reports.filter(report => 
      locationKeywords.some(keyword => 
        report.content.toLowerCase().includes(keyword.toLowerCase())
      )
    );
  }

  // Mock real-time updates simulation
  async simulateRealTimeUpdates(disasterId, callback) {
    const mockUpdates = [
      {
        id: `realtime_${Date.now()}`,
        platform: 'twitter',
        content: `New update: Evacuation order issued for ${disasterId} area. Please follow emergency instructions.`,
        author: 'emergency_services',
        created_at: new Date().toISOString(),
        priority: 'urgent'
      }
    ];

    // Simulate real-time updates every 30 seconds
    setInterval(() => {
      const update = mockUpdates[Math.floor(Math.random() * mockUpdates.length)];
      if (callback) {
        callback(update);
      }
    }, 30000);

    return mockUpdates;
  }
}

module.exports = new SocialMediaService(); 