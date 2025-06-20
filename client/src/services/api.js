// Mock API service for frontend-only deployment
class MockAPIService {
  constructor() {
    this.baseURL = window.location.origin;
    this.mockData = {
      disasters: [
        {
          id: '1',
          title: 'Hurricane Maria Response',
          description: 'Emergency response coordination for Hurricane Maria',
          location: 'Puerto Rico',
          severity: 'high',
          status: 'active',
          createdAt: '2024-01-15T10:30:00Z',
          coordinates: { lat: 18.2208, lng: -66.5901 }
        },
        {
          id: '2',
          title: 'Earthquake Relief',
          description: 'Coordination for earthquake relief efforts',
          location: 'California',
          severity: 'medium',
          status: 'active',
          createdAt: '2024-01-14T15:45:00Z',
          coordinates: { lat: 36.7783, lng: -119.4179 }
        }
      ],
      resources: [
        {
          id: '1',
          name: 'Emergency Medical Team',
          type: 'medical',
          location: 'Puerto Rico',
          status: 'available',
          contact: '+1-555-0123'
        },
        {
          id: '2',
          name: 'Search and Rescue Unit',
          type: 'rescue',
          location: 'California',
          status: 'deployed',
          contact: '+1-555-0456'
        }
      ],
      socialMedia: [
        {
          id: '1',
          platform: 'twitter',
          content: 'Emergency shelters open in downtown area #disasterresponse',
          timestamp: '2024-01-15T12:00:00Z',
          sentiment: 'positive'
        }
      ]
    };
  }

  async request(endpoint, options = {}) {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const url = `${this.baseURL}${endpoint}`;
    
    // Mock responses based on endpoint
    if (endpoint.includes('/api/health')) {
      return { status: 'OK', timestamp: new Date().toISOString() };
    }
    
    if (endpoint.includes('/api/disasters')) {
      return { data: this.mockData.disasters, error: null };
    }
    
    if (endpoint.includes('/api/resources')) {
      return { data: this.mockData.resources, error: null };
    }
    
    if (endpoint.includes('/api/social-media')) {
      return { data: this.mockData.socialMedia, error: null };
    }
    
    if (endpoint.includes('/api/auth/login')) {
      return { 
        data: { 
          token: 'mock-jwt-token',
          user: { username: options.body?.username || 'user', role: 'admin' }
        }, 
        error: null 
      };
    }
    
    return { data: null, error: 'Endpoint not found' };
  }

  async get(endpoint) {
    return this.request(endpoint);
  }

  async post(endpoint, data) {
    return this.request(endpoint, { method: 'POST', body: data });
  }

  async put(endpoint, data) {
    return this.request(endpoint, { method: 'PUT', body: data });
  }

  async delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }
}

// Export singleton instance
export const api = new MockAPIService();
export default api; 