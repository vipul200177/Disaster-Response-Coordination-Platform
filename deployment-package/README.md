# Disaster Response Platform

A comprehensive MERN stack application for disaster management with real-time data aggregation, AI integration, and geospatial capabilities.

## 🚀 Features

- **Real-time Disaster Management**: CRUD operations with WebSocket updates
- **AI-Powered Location Extraction**: Google Gemini API integration
- **Geospatial Resource Mapping**: PostgreSQL PostGIS with Supabase
- **Social Media Monitoring**: Mock Twitter API for disaster reports
- **Image Verification**: AI-powered authenticity checking
- **Official Updates**: Web scraping for government/relief updates
- **Role-based Authentication**: Admin and contributor roles
- **Comprehensive Caching**: Supabase-based caching system

## 🛠️ Tech Stack

- **Backend**: Node.js, Express.js, Socket.IO
- **Frontend**: React.js, WebSocket client
- **Database**: Supabase (PostgreSQL with PostGIS)
- **AI Services**: Google Gemini API
- **Geocoding**: OpenStreetMap (with Google Maps/Mapbox fallback)
- **Deployment**: Vercel (frontend), Render (backend)

## 📋 Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account
- Google Gemini API key (optional)
- Google Maps API key (optional)

## 🚀 Quick Start

### 1. Clone the Repository
```bash
git clone <your-repo-url>
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
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key

# AI Services (Optional)
GEMINI_API_KEY=your_gemini_api_key

# Geocoding Services (Optional)
GOOGLE_MAPS_API_KEY=your_google_maps_key
MAPBOX_ACCESS_TOKEN=your_mapbox_token

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### 4. Database Setup
1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Run the SQL schema from `database/schema.sql` in your Supabase SQL editor
3. Update your `.env` file with Supabase credentials

### 5. Start Development Servers
```bash
# Start backend server
npm start

# Start frontend (in new terminal)
cd client
npm start
```

## 🌐 API Endpoints

### Disasters
- `POST /api/disasters` - Create disaster
- `GET /api/disasters` - List disasters
- `PUT /api/disasters/:id` - Update disaster
- `DELETE /api/disasters/:id` - Delete disaster

### Social Media
- `GET /api/social-media/:disasterId` - Get social media reports
- `GET /api/social-media/:disasterId/priority-alerts` - Get priority alerts

### Resources
- `GET /api/resources/:disasterId` - Get resources for disaster
- `POST /api/resources` - Create resource

### Verification
- `POST /api/verification/:disasterId` - Verify disaster image

### Geocoding
- `POST /api/geocoding` - Geocode location

## 🔧 Development

### Project Structure
```
├── server.js              # Main server file
├── routes/                # API routes
├── services/              # External service integrations
├── middleware/            # Authentication and validation
├── utils/                 # Utilities and helpers
├── database/              # Database schema
├── client/                # React frontend
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── services/      # Frontend API services
│   │   └── context/       # React context
│   └── public/
└── logs/                  # Application logs
```

### Testing Credentials
- **Admin**: `netrunnerX` / `admin123`
- **Contributor**: `fieldWorker` / `worker123`

## 🚀 Deployment

### Frontend (Vercel)
1. Push code to GitHub
2. Connect repository to Vercel
3. Set build command: `cd client && npm install && npm run build`
4. Set output directory: `client/build`
5. Deploy

### Backend (Render)
1. Connect GitHub repository to Render
2. Set build command: `npm install`
3. Set start command: `npm start`
4. Add environment variables
5. Deploy

## 📊 Features Status

| Feature | Status | Notes |
|---------|--------|-------|
| Disaster CRUD | ✅ Complete | Full CRUD with audit trails |
| WebSocket Events | ✅ Complete | Real-time updates |
| Geospatial Queries | ✅ Complete | PostGIS integration |
| AI Location Extraction | ✅ Complete | Gemini API integration |
| Social Media Monitoring | ✅ Complete | Mock API with real-time updates |
| Image Verification | ✅ Complete | AI-powered verification |
| Authentication | ✅ Complete | JWT with role-based access |
| Caching System | ✅ Complete | Supabase-based caching |
| Rate Limiting | ✅ Complete | API protection |
| Deployment Ready | ✅ Complete | Vercel + Render configs |

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License.

## 🆘 Support

For support, please open an issue in the GitHub repository or contact the development team.

---

**Built with ❤️ using Cursor AI for rapid development** 