# Disaster Response Coordination Platform

A comprehensive MERN stack application for real-time disaster response coordination with AI-powered location extraction, geospatial resource mapping, and social media monitoring.

## 🚀 Features

### Core Functionality
- **Disaster Data Management**: Full CRUD operations for disaster records with ownership and audit trail tracking
- **AI-Powered Location Extraction**: Uses Google Gemini API to extract location names from disaster descriptions
- **Multi-Service Geocoding**: Supports Google Maps, Mapbox, and OpenStreetMap for coordinate conversion
- **Real-Time Social Media Monitoring**: Mock Twitter API with support for real Twitter API and Bluesky
- **Geospatial Resource Mapping**: Supabase geospatial queries for finding nearby resources and affected areas
- **Official Updates Aggregation**: Web scraping from FEMA, Red Cross, and National Weather Service
- **Image Verification**: Google Gemini Vision API for analyzing disaster image authenticity
- **Real-Time Updates**: WebSocket integration for live data updates

### Technical Features
- **Supabase Integration**: PostgreSQL database with geospatial indexes and caching
- **Rate Limiting**: Per-user rate limiting with configurable limits
- **Structured Logging**: Winston-based logging with audit trails
- **Authentication**: Mock authentication system with role-based access control
- **Caching**: Intelligent caching system for external API responses
- **Error Handling**: Comprehensive error handling and fallback mechanisms

## 🛠️ Tech Stack

### Backend
- **Node.js** with Express.js
- **Socket.IO** for real-time communication
- **Supabase** (PostgreSQL) for database and caching
- **Google Gemini API** for AI-powered features
- **Winston** for structured logging
- **Cheerio** for web scraping

### Frontend
- **React** with modern hooks
- **Socket.IO Client** for real-time updates
- **React Router** for navigation
- **React Hook Form** for form handling
- **React Hot Toast** for notifications
- **Lucide React** for icons

### External APIs
- **Google Gemini API** (Location extraction & Image verification)
- **Google Maps API** (Geocoding)
- **Mapbox API** (Alternative geocoding)
- **OpenStreetMap** (Free geocoding fallback)
- **Twitter API** (Social media monitoring)
- **Bluesky API** (Alternative social media)

## 📋 Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Supabase account
- Google Gemini API key
- Google Maps API key (optional)
- Mapbox access token (optional)
- Twitter API credentials (optional)

## 🚀 Quick Start

### 1. Clone the Repository
```bash
git clone <repository-url>
cd disaster-response-platform
```

### 2. Install Dependencies
```bash
# Install backend dependencies
npm install

# Install frontend dependencies
cd client
npm install
cd ..
```

### 3. Environment Setup
Create a `.env` file in the root directory:
```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Supabase Configuration
SUPABASE_URL=your_supabase_url_here
SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here

# Google Gemini API
GEMINI_API_KEY=your_gemini_api_key_here

# Google Maps API (for geocoding)
GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here

# Mapbox API (alternative for geocoding)
MAPBOX_ACCESS_TOKEN=your_mapbox_access_token_here

# Twitter API (optional - if available)
TWITTER_BEARER_TOKEN=your_twitter_bearer_token_here

# Bluesky API (alternative social media)
BLUESKY_IDENTIFIER=your_bluesky_identifier_here
BLUESKY_PASSWORD=your_bluesky_password_here

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Cache TTL (in seconds)
CACHE_TTL=3600
```

### 4. Database Setup
1. Create a new Supabase project
2. Run the SQL schema from `database/schema.sql` in your Supabase SQL editor
3. Copy your Supabase URL and anon key to the `.env` file

### 5. API Keys Setup
1. **Google Gemini API**: Get your API key from [Google AI Studio](https://aistudio.google.com/app/apikey)
2. **Google Maps API**: Get your API key from [Google Cloud Console](https://console.cloud.google.com)
3. **Mapbox**: Get your access token from [Mapbox](https://www.mapbox.com)
4. **Twitter API**: Apply for access at [Twitter Developer Portal](https://developer.twitter.com)

### 6. Start the Application
```bash
# Start backend server
npm run dev

# In a new terminal, start frontend
cd client
npm start
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

## 🔐 Authentication

The platform uses mock authentication with predefined users:

| Username | Role | Permissions |
|----------|------|-------------|
| netrunnerX | Admin | Full access |
| reliefAdmin | Admin | Full access |
| fieldWorker | Contributor | Read, Write |
| volunteer | Volunteer | Read only |
| citizen1 | Citizen | Read only |

To login, use any of these usernames in the login form.

## 📡 API Endpoints

### Disasters
- `POST /api/disasters` - Create disaster
- `GET /api/disasters` - List disasters
- `GET /api/disasters/:id` - Get disaster details
- `PUT /api/disasters/:id` - Update disaster
- `DELETE /api/disasters/:id` - Delete disaster
- `GET /api/disasters/:id/audit-trail` - Get audit trail

### Social Media
- `GET /api/social-media/:disasterId` - Get social media reports
- `GET /api/social-media/:disasterId/priority-alerts` - Get priority alerts
- `GET /api/social-media/location/:locationKeywords` - Get location-based reports

### Resources
- `POST /api/resources` - Create resource
- `GET /api/resources/:disasterId` - Get resources for disaster
- `GET /api/resources/:disasterId/nearby` - Find nearby resources
- `POST /api/resources/:disasterId/bulk-create` - Bulk create resources

### Official Updates
- `GET /api/updates/:disasterId` - Get official updates
- `GET /api/updates/source/:source` - Get updates by source
- `GET /api/updates/emergency-alerts` - Get emergency alerts

### Verification
- `POST /api/verification/:disasterId/verify-image` - Verify image
- `POST /api/verification/:disasterId/submit-report` - Submit report
- `PUT /api/verification/reports/:reportId/verify` - Manual verification

### Geocoding
- `POST /api/geocoding/extract-location` - Extract location from text
- `POST /api/geocoding/geocode` - Convert location to coordinates

## 🗄️ Database Schema

### Tables
- **disasters**: Main disaster records with geospatial data
- **resources**: Available resources with location data
- **reports**: User reports and verification status
- **cache**: External API response caching

### Geospatial Features
- PostGIS integration for location-based queries
- Geospatial indexes for fast location searches
- Distance calculation functions
- Nearby resource finding

## 🔄 Real-Time Features

The platform uses Socket.IO for real-time updates:

### Events
- `disaster_created` - New disaster created
- `disaster_updated` - Disaster information updated
- `disaster_deleted` - Disaster removed
- `social_media_updated` - New social media reports
- `resource_created` - New resource added
- `image_verification_completed` - Image verification finished
- `official_updates_updated` - New official updates

## 🧪 Testing

### Backend Testing
```bash
# Test API endpoints
curl -X GET http://localhost:5000/api/health

# Test disaster creation
curl -X POST http://localhost:5000/api/disasters \
  -H "Authorization: Bearer netrunnerX" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Disaster",
    "description": "Flooding in Manhattan area",
    "tags": ["flood", "urgent"]
  }'
```

### Frontend Testing
The React app includes basic testing setup with Jest and React Testing Library.

## 🚀 Deployment

### Backend Deployment (Render)
1. Connect your GitHub repository to Render
2. Set environment variables in Render dashboard
3. Deploy as a Node.js service

### Frontend Deployment (Vercel)
1. Connect your GitHub repository to Vercel
2. Set build command: `npm run build`
3. Set output directory: `client/build`

### Database Deployment
- Use Supabase production instance
- Configure environment variables for production
- Set up proper security policies

## 📊 Monitoring and Logging

### Logging
- Structured logging with Winston
- Log levels: error, warn, info, debug
- Log files: `logs/error.log`, `logs/combined.log`

### Monitoring
- Health check endpoint: `/api/health`
- Rate limiting headers
- Error tracking and reporting

## 🔧 Configuration

### Rate Limiting
- Default: 100 requests per 15 minutes per user
- Configurable via environment variables
- Different limits for different endpoints

### Caching
- Default TTL: 1 hour
- Cache external API responses
- Automatic cache invalidation

### Geocoding
- Fallback chain: Google Maps → Mapbox → OpenStreetMap
- Configurable timeout and retry logic
- Coordinate validation

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:
- Create an issue in the GitHub repository
- Check the documentation
- Review the API endpoints

## 🔮 Future Enhancements

- Real-time mapping integration
- Advanced AI analysis
- Mobile application
- Integration with more emergency services
- Advanced reporting and analytics
- Machine learning for disaster prediction

---

**Built with ❤️ for disaster response coordination** 