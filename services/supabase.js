const { createClient } = require('@supabase/supabase-js');
const { logger, logCacheOperation } = require('../utils/logger');

let supabase = null;

const initializeSupabase = () => {
  try {
    // Check if required environment variables are set
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
      logger.warn('Supabase environment variables not set. Running in mock mode.');
      logger.warn('To use real Supabase, set SUPABASE_URL and SUPABASE_ANON_KEY in your .env file');
      
      // Create a mock client for testing
      supabase = {
        from: () => ({
          select: () => ({
            eq: () => ({
              single: () => ({ data: null, error: null }),
              order: () => ({ data: [], error: null })
            }),
            contains: () => ({
              order: () => ({ data: [], error: null })
            }),
            order: () => ({ data: [], error: null }),
            single: () => ({ data: null, error: null }),
            insert: () => ({
              select: () => ({
                single: () => ({ data: null, error: null })
              })
            }),
            update: () => ({
              eq: () => ({
                select: () => ({
                  single: () => ({ data: null, error: null })
                })
              })
            }),
            delete: () => ({ error: null }),
            upsert: () => ({ data: null, error: null }),
            rpc: () => ({ data: null, error: null })
          }),
          rpc: () => ({ data: null, error: null })
        }),
        rpc: () => ({ data: null, error: null })
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
    
    // Create a mock client as fallback
    supabase = {
      from: () => ({
        select: () => ({
          eq: () => ({
            single: () => ({ data: null, error: null }),
            order: () => ({ data: [], error: null })
          }),
          contains: () => ({
            order: () => ({ data: [], error: null })
          }),
          order: () => ({ data: [], error: null }),
          single: () => ({ data: null, error: null }),
          insert: () => ({
            select: () => ({
              single: () => ({ data: null, error: null })
            })
          }),
          update: () => ({
            eq: () => ({
              select: () => ({
                single: () => ({ data: null, error: null })
              })
            })
          }),
          delete: () => ({
            eq: () => ({ error: null })
          }),
          upsert: () => ({ error: null })
        }),
        rpc: () => ({ data: [], error: null })
      })
    };
  }
};

// Cache management functions
const getCachedData = async (key) => {
  try {
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

    const { data, error } = await query.order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
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
    return data;
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