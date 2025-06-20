-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- Create disasters table
CREATE TABLE IF NOT EXISTS disasters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    location_name TEXT,
    location GEOGRAPHY(POINT, 4326),
    description TEXT NOT NULL,
    tags TEXT[] DEFAULT '{}',
    owner_id TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    audit_trail JSONB DEFAULT '[]',
    severity_level TEXT DEFAULT 'medium',
    disaster_type TEXT DEFAULT 'unknown',
    urgency_indicator BOOLEAN DEFAULT FALSE,
    affected_areas TEXT[] DEFAULT '{}',
    key_needs TEXT[] DEFAULT '{}',
    analyzed_at TIMESTAMP WITH TIME ZONE
);

-- Create resources table
CREATE TABLE IF NOT EXISTS resources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    disaster_id UUID REFERENCES disasters(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    location_name TEXT NOT NULL,
    location GEOGRAPHY(POINT, 4326),
    type TEXT NOT NULL,
    capacity INTEGER,
    contact_info TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by TEXT NOT NULL
);

-- Create reports table
CREATE TABLE IF NOT EXISTS reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    disaster_id UUID REFERENCES disasters(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    content TEXT NOT NULL,
    image_url TEXT,
    verification_status TEXT DEFAULT 'pending',
    verification_details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create cache table
CREATE TABLE IF NOT EXISTS cache (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Create geospatial indexes
CREATE INDEX IF NOT EXISTS disasters_location_idx ON disasters USING GIST (location);
CREATE INDEX IF NOT EXISTS disasters_tags_idx ON disasters USING GIN (tags);
CREATE INDEX IF NOT EXISTS disasters_owner_idx ON disasters (owner_id);
CREATE INDEX IF NOT EXISTS disasters_created_at_idx ON disasters (created_at DESC);

CREATE INDEX IF NOT EXISTS resources_location_idx ON resources USING GIST (location);
CREATE INDEX IF NOT EXISTS resources_disaster_idx ON resources (disaster_id);
CREATE INDEX IF NOT EXISTS resources_type_idx ON resources (type);

CREATE INDEX IF NOT EXISTS reports_disaster_idx ON reports (disaster_id);
CREATE INDEX IF NOT EXISTS reports_user_idx ON reports (user_id);
CREATE INDEX IF NOT EXISTS reports_status_idx ON reports (verification_status);

CREATE INDEX IF NOT EXISTS cache_expires_idx ON cache (expires_at);

-- Create function for finding nearby resources
CREATE OR REPLACE FUNCTION find_nearby_resources(
    lat DOUBLE PRECISION,
    lng DOUBLE PRECISION,
    radius_meters INTEGER DEFAULT 10000
)
RETURNS TABLE (
    id UUID,
    name TEXT,
    location_name TEXT,
    type TEXT,
    distance_meters DOUBLE PRECISION
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        r.id,
        r.name,
        r.location_name,
        r.type,
        ST_Distance(
            r.location::geography,
            ST_SetSRID(ST_Point(lng, lat), 4326)::geography
        ) as distance_meters
    FROM resources r
    WHERE ST_DWithin(
        r.location::geography,
        ST_SetSRID(ST_Point(lng, lat), 4326)::geography,
        radius_meters
    )
    ORDER BY distance_meters;
END;
$$ LANGUAGE plpgsql;

-- Create function for finding disasters in area
CREATE OR REPLACE FUNCTION find_disasters_in_area(
    lat DOUBLE PRECISION,
    lng DOUBLE PRECISION,
    radius_meters INTEGER DEFAULT 50000
)
RETURNS TABLE (
    id UUID,
    title TEXT,
    location_name TEXT,
    distance_meters DOUBLE PRECISION
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        d.id,
        d.title,
        d.location_name,
        ST_Distance(
            d.location::geography,
            ST_SetSRID(ST_Point(lng, lat), 4326)::geography
        ) as distance_meters
    FROM disasters d
    WHERE ST_DWithin(
        d.location::geography,
        ST_SetSRID(ST_Point(lng, lat), 4326)::geography,
        radius_meters
    )
    ORDER BY distance_meters;
END;
$$ LANGUAGE plpgsql;

-- Insert sample data
INSERT INTO disasters (title, location_name, description, tags, owner_id, location) VALUES
(
    'NYC Flood',
    'Manhattan, NYC',
    'Heavy flooding in Manhattan affecting Lower East Side',
    ARRAY['flood', 'urgent'],
    'netrunnerX',
    ST_SetSRID(ST_Point(-74.0060, 40.7128), 4326)
),
(
    'California Wildfire',
    'Los Angeles, CA',
    'Major wildfire spreading rapidly in LA County',
    ARRAY['wildfire', 'emergency'],
    'reliefAdmin',
    ST_SetSRID(ST_Point(-118.2437, 34.0522), 4326)
);

INSERT INTO resources (disaster_id, name, location_name, type, location) VALUES
(
    (SELECT id FROM disasters WHERE title = 'NYC Flood' LIMIT 1),
    'Red Cross Shelter',
    'Lower East Side, NYC',
    'shelter',
    ST_SetSRID(ST_Point(-73.9900, 40.7150), 4326)
),
(
    (SELECT id FROM disasters WHERE title = 'NYC Flood' LIMIT 1),
    'Emergency Food Distribution',
    'Chinatown, NYC',
    'food',
    ST_SetSRID(ST_Point(-73.9970, 40.7150), 4326)
);

INSERT INTO reports (disaster_id, user_id, content, verification_status) VALUES
(
    (SELECT id FROM disasters WHERE title = 'NYC Flood' LIMIT 1),
    'citizen1',
    'Need food in Lower East Side',
    'pending'
),
(
    (SELECT id FROM disasters WHERE title = 'NYC Flood' LIMIT 1),
    'citizen2',
    'Water level rising rapidly on Delancey Street',
    'verified'
); 