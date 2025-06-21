const { createClient } = require('@supabase/supabase-js');
const { logger, logCacheOperation } = require('../utils/logger');

let supabase = null;

const initializeSupabase = () => {
  try {
    // Check if required environment variables are set
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
      logger.warn('Supabase environment variables not set. Running in mock mode.');
      logger.warn('To use real Supabase, set SUPABASE_URL and SUPABASE_ANON_KEY in your .env file');
      
      // Create a comprehensive mock client as fallback
      const createMockQuery = (tableName = 'disasters') => {
        const mockData = {
          disasters: [
            {
              id: 'mock-disaster-1',
              title: 'Mock Earthquake Response',
              description: 'Test disaster for development',
              location: { lat: 40.7128, lng: -74.0060 },
              severity: 'high',
              status: 'active',
              created_at: new Date().toISOString(),
              tags: ['earthquake', 'emergency'],
              owner_id: 'netrunnerX'
            }
          ],
          resources: [
            {
              id: 'mock-resource-1',
              name: 'Emergency Shelter',
              type: 'shelter',
              location: { lat: 40.7128, lng: -74.0060 },
              capacity: 100,
              disaster_id: 'mock-disaster-1',
              location_name: 'Downtown Shelter'
            },
            {
              id: 'mock-resource-2',
              name: 'Medical Supplies',
              type: 'medical',
              location: { lat: 40.7128, lng: -74.0060 },
              capacity: 50,
              disaster_id: 'mock-disaster-1',
              location_name: 'Central Medical Center'
            }
          ],
          reports: [
            {
              id: 'mock-report-1',
              title: 'Damage Assessment',
              content: 'Building damage reported in downtown area',
              disaster_id: 'mock-disaster-1',
              verification_status: 'pending'
            }
          ]
        };

        let currentFilters = {};

        return {
          eq: (field, value) => {
            currentFilters[field] = value;
            return createMockQuery(tableName);
          },
          contains: (field, value) => {
            currentFilters[field] = value;
            return createMockQuery(tableName);
          },
          order: (field, options = {}) => {
            // Return a promise that resolves to filtered mock data
            let data = mockData[tableName] || [];
            
            // Apply filters
            if (currentFilters.disaster_id) {
              data = data.filter(item => item.disaster_id === currentFilters.disaster_id);
            }
            if (currentFilters.owner_id) {
              data = data.filter(item => item.owner_id === currentFilters.owner_id);
            }
            
            return Promise.resolve({ 
              data: data, 
              error: null 
            });
          },
          single: () => {
            let data = mockData[tableName] || [];
            if (currentFilters.disaster_id) {
              data = data.filter(item => item.disaster_id === currentFilters.disaster_id);
            }
            return Promise.resolve({ data: data[0] || null, error: null });
          },
          select: (fields = '*') => createMockQuery(tableName),
          insert: (data) => Promise.resolve({ data: data, error: null }),
          update: (data) => Promise.resolve({ data: data, error: null }),
          delete: () => Promise.resolve({ error: null }),
          upsert: (data) => Promise.resolve({ data: data, error: null }),
          rpc: (func, params) => Promise.resolve({ data: [], error: null })
        };
      };

      supabase = {
        from: (table) => createMockQuery(table),
        rpc: (func, params) => Promise.resolve({ data: [], error: null }),
        sql: (template) => template
      };
      
      logger.info('Mock Supabase client initialized for testing');
      return;
    }

    supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );
    logger.info('Supabase client initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize Supabase client:', error);
    logger.warn('Falling back to mock mode for testing');
    
    // Create a comprehensive mock client as fallback
    const createMockQuery = (tableName = 'disasters') => {
      const mockData = {
        disasters: [
          {
            id: 'mock-disaster-1',
            title: 'Mock Earthquake Response',
            description: 'Test disaster for development',
            location: { lat: 40.7128, lng: -74.0060 },
            severity: 'high',
            status: 'active',
            created_at: new Date().toISOString(),
            tags: ['earthquake', 'emergency'],
            owner_id: 'netrunnerX'
          }
        ],
        resources: [
          {
            id: 'mock-resource-1',
            name: 'Emergency Shelter',
            type: 'shelter',
            location: { lat: 40.7128, lng: -74.0060 },
            capacity: 100,
            disaster_id: 'mock-disaster-1',
            location_name: 'Downtown Shelter'
          },
          {
            id: 'mock-resource-2',
            name: 'Medical Supplies',
            type: 'medical',
            location: { lat: 40.7128, lng: -74.0060 },
            capacity: 50,
            disaster_id: 'mock-disaster-1',
            location_name: 'Central Medical Center'
          }
        ],
        reports: [
          {
            id: 'mock-report-1',
            title: 'Damage Assessment',
            content: 'Building damage reported in downtown area',
            disaster_id: 'mock-disaster-1',
            verification_status: 'pending'
          }
        ]
      };

      let currentFilters = {};

      return {
        eq: (field, value) => {
          currentFilters[field] = value;
          return createMockQuery(tableName);
        },
        contains: (field, value) => {
          currentFilters[field] = value;
          return createMockQuery(tableName);
        },
        order: (field, options = {}) => {
          // Return a promise that resolves to filtered mock data
          let data = mockData[tableName] || [];
          
          // Apply filters
          if (currentFilters.disaster_id) {
            data = data.filter(item => item.disaster_id === currentFilters.disaster_id);
          }
          if (currentFilters.owner_id) {
            data = data.filter(item => item.owner_id === currentFilters.owner_id);
          }
          
          return Promise.resolve({ 
            data: data, 
            error: null 
          });
        },
        single: () => {
          let data = mockData[tableName] || [];
          if (currentFilters.disaster_id) {
            data = data.filter(item => item.disaster_id === currentFilters.disaster_id);
          }
          return Promise.resolve({ data: data[0] || null, error: null });
        },
        select: (fields = '*') => createMockQuery(tableName),
        insert: (data) => Promise.resolve({ data: data, error: null }),
        update: (data) => Promise.resolve({ data: data, error: null }),
        delete: () => Promise.resolve({ error: null }),
        upsert: (data) => Promise.resolve({ data: data, error: null }),
        rpc: (func, params) => Promise.resolve({ data: [], error: null })
      };
    };

    supabase = {
      from: (table) => createMockQuery(table),
      rpc: (func, params) => Promise.resolve({ data: [], error: null }),
      sql: (template) => template
    };
  }
};

// Cache management functions
const getCachedData = async (key) => {
  try {
    // For mock client, return null
    if (!supabase || !supabase.from) {
      return null;
    }

    const { data, error } = await supabase
      .from('cache')
      .select('*')
      .eq('key', key)
      .single();

    if (error || !data) {
      return null;
    }

    // Check if cache has expired
    if (new Date() > new Date(data.expires_at)) {
      // Delete expired cache entry
      await supabase.from('cache').delete().eq('key', key);
      return null;
    }

    return JSON.parse(data.value);
  } catch (error) {
    logger.error('Error getting cached data:', error);
    return null;
  }
};

const setCachedData = async (key, value, ttlSeconds = 3600) => {
  try {
    // For mock client, return true
    if (!supabase || !supabase.from) {
      return true;
    }

    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
    
    const { error } = await supabase
      .from('cache')
      .upsert({
        key,
        value,
        expires_at: expiresAt.toISOString()
      });

    if (error) {
      logger.error('Error setting cached data:', error);
      return false;
    }

    logCacheOperation('set', key, true);
    return true;
  } catch (error) {
    logger.error('Error setting cached data:', error);
    return false;
  }
};

// Disaster CRUD operations
const createDisaster = async (disasterData) => {
  try {
    const { data, error } = await supabase
      .from('disasters')
      .insert([disasterData])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    logger.error('Error creating disaster:', error);
    throw error;
  }
};

const getDisasters = async (filters = {}) => {
  try {
    let query = supabase.from('disasters').select('*');
    
    if (filters.tag) {
      query = query.contains('tags', [filters.tag]);
    }
    
    if (filters.owner_id) {
      query = query.eq('owner_id', filters.owner_id);
    }

    // Handle both real and mock clients
    const result = await query.order('created_at', { ascending: false });
    
    // For mock client, result is already a promise that resolves to { data, error }
    if (result && typeof result.then === 'function') {
      const { data, error } = await result;
      if (error) throw error;
      return data || [];
    } else if (result && result.data !== undefined) {
      if (result.error) throw result.error;
      return result.data || [];
    } else {
      // Mock client fallback
      return [];
    }
  } catch (error) {
    logger.error('Error getting disasters:', error);
    throw error;
  }
};

const updateDisaster = async (id, updates) => {
  try {
    const { data, error } = await supabase
      .from('disasters')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    logger.error('Error updating disaster:', error);
    throw error;
  }
};

const deleteDisaster = async (id) => {
  try {
    const { error } = await supabase
      .from('disasters')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  } catch (error) {
    logger.error('Error deleting disaster:', error);
    throw error;
  }
};

// Geospatial queries
const findNearbyResources = async (latitude, longitude, radiusKm = 10) => {
  try {
    const { data, error } = await supabase
      .rpc('find_nearby_resources', {
        lat: latitude,
        lng: longitude,
        radius_meters: radiusKm * 1000
      });

    if (error) throw error;
    return data;
  } catch (error) {
    logger.error('Error finding nearby resources:', error);
    throw error;
  }
};

const findDisastersInArea = async (latitude, longitude, radiusKm = 50) => {
  try {
    const { data, error } = await supabase
      .rpc('find_disasters_in_area', {
        lat: latitude,
        lng: longitude,
        radius_meters: radiusKm * 1000
      });

    if (error) throw error;
    return data;
  } catch (error) {
    logger.error('Error finding disasters in area:', error);
    throw error;
  }
};

// Resource management
const createResource = async (resourceData) => {
  try {
    const { data, error } = await supabase
      .from('resources')
      .insert([resourceData])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    logger.error('Error creating resource:', error);
    throw error;
  }
};

const getResourcesByDisaster = async (disasterId) => {
  try {
    const { data, error } = await supabase
      .from('resources')
      .select('*')
      .eq('disaster_id', disasterId);

    if (error) throw error;
    return data || [];
  } catch (error) {
    logger.error('Error getting resources by disaster:', error);
    throw error;
  }
};

// Report management
const createReport = async (reportData) => {
  try {
    const { data, error } = await supabase
      .from('reports')
      .insert([reportData])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    logger.error('Error creating report:', error);
    throw error;
  }
};

const updateReportVerification = async (reportId, verificationStatus) => {
  try {
    const { data, error } = await supabase
      .from('reports')
      .update({ verification_status: verificationStatus })
      .eq('id', reportId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    logger.error('Error updating report verification:', error);
    throw error;
  }
};

// Audit trail management
const addAuditTrail = async (disasterId, action, userId, details = {}) => {
  try {
    const auditEntry = {
      action,
      user_id: userId,
      timestamp: new Date().toISOString(),
      ...details
    };

    const { data, error } = await supabase
      .from('disasters')
      .update({
        audit_trail: supabase.sql`audit_trail || ${JSON.stringify(auditEntry)}::jsonb`
      })
      .eq('id', disasterId)
      .select('audit_trail')
      .single();

    if (error) throw error;
    return data.audit_trail;
  } catch (error) {
    logger.error('Error adding audit trail:', error);
    throw error;
  }
};

module.exports = {
  initializeSupabase,
  getCachedData,
  setCachedData,
  createDisaster,
  getDisasters,
  updateDisaster,
  deleteDisaster,
  findNearbyResources,
  findDisastersInArea,
  createResource,
  getResourcesByDisaster,
  createReport,
  updateReportVerification,
  addAuditTrail,
  getSupabase: () => supabase
}; 