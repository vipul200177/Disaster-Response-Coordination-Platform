# Setting Up Real Database Integration

## Step 1: Create Supabase Account
1. Go to https://supabase.com
2. Sign up for a free account
3. Create a new project

## Step 2: Get Your Credentials
1. Go to Settings > API
2. Copy your:
   - Project URL
   - Anon (public) key
   - Service role key (for admin operations)

## Step 3: Set Up Environment Variables
Create a `.env` file in your project root:

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Supabase Configuration (REPLACE WITH YOUR REAL VALUES)
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Optional: Add real API keys for enhanced features
GEMINI_API_KEY=your_gemini_api_key_here
GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
MAPBOX_ACCESS_TOKEN=your_mapbox_access_token_here
```

## Step 4: Run Database Schema
1. Go to your Supabase dashboard
2. Navigate to SQL Editor
3. Copy and paste the contents of `database/schema.sql`
4. Run the SQL to create all tables and functions

## Step 5: Restart Your Application
```bash
# Stop current server (Ctrl+C)
# Then restart
npm start
```

## Step 6: Test Real Data
- Your platform will now use real Supabase data
- All CRUD operations will persist to the database
- Geospatial queries will work with real coordinates 