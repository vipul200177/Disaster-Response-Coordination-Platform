const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

// Import services
const { logger } = require('../utils/logger');
const { initializeSupabase } = require('../services/supabase');

const app = express();

// Initialize Supabase
try {
  initializeSupabase();
} catch (error) {
  logger.error('Failed to initialize Supabase:', error);
}

// Trust proxy for rate limiting (fixes X-Forwarded-For warning)
app.set('trust proxy', 1);

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? false : "http://localhost:3000",
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Create mock IO object for serverless environment
const mockIO = {
  emit: (event, data) => {
    logger.info(`Mock WebSocket emit: ${event}`, data);
  },
  to: (room) => ({
    emit: (event, data) => {
      logger.info(`Mock WebSocket emit to ${room}: ${event}`, data);
    }
  })
};

// Make mock io available to routes
app.set('io', mockIO);

// Health check endpoint (no authentication required)
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'production',
    message: 'Disaster Response Platform API is running'
  });
});

// Simple test endpoint
app.get('/api/test', (req, res) => {
  res.json({ 
    message: 'Serverless function is working!',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'production'
  });
});

// Try to load routes with error handling
try {
  const disasterRoutes = require('../routes/disasters');
  const socialMediaRoutes = require('../routes/socialMedia');
  const resourceRoutes = require('../routes/resources');
  const updateRoutes = require('../routes/updates');
  const verificationRoutes = require('../routes/verification');
  const geocodingRoutes = require('../routes/geocoding');

  // Routes
  app.use('/api/disasters', disasterRoutes);
  app.use('/api/social-media', socialMediaRoutes);
  app.use('/api/resources', resourceRoutes);
  app.use('/api/updates', updateRoutes);
  app.use('/api/verification', verificationRoutes);
  app.use('/api/geocoding', geocodingRoutes);
  
  logger.info('All API routes loaded successfully');
} catch (error) {
  logger.error('Failed to load some routes:', error);
  
  // Fallback routes
  app.get('/api/disasters', (req, res) => {
    res.json({ 
      error: 'Service temporarily unavailable',
      message: 'Disaster routes are being loaded'
    });
  });
  
  app.get('/api/resources', (req, res) => {
    res.json({ 
      error: 'Service temporarily unavailable',
      message: 'Resource routes are being loaded'
    });
  });
}

// Check if build directory exists before serving static files
const buildPath = path.join(__dirname, '../client/build');
const indexPath = path.join(buildPath, 'index.html');

if (require('fs').existsSync(buildPath)) {
  app.use(express.static(buildPath));
  logger.info('Static files directory found, serving React app');
} else {
  logger.warn('Build directory not found. Run "npm run build" in the client directory to build the React app');
}

// Serve React app for any non-API routes (only if build exists)
app.get('*', (req, res) => {
  if (require('fs').existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).json({ 
      error: 'Frontend not built', 
      message: 'Please run "npm run build" in the client directory to build the React app',
      apiAvailable: true,
      endpoints: [
        '/api/health',
        '/api/test',
        '/api/disasters',
        '/api/social-media',
        '/api/resources',
        '/api/updates',
        '/api/verification',
        '/api/geocoding'
      ]
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Export the Express app for Vercel serverless functions
module.exports = app; 