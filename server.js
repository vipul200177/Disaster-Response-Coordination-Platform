const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

// Import routes
const disasterRoutes = require('./routes/disasters');
const socialMediaRoutes = require('./routes/socialMedia');
const resourceRoutes = require('./routes/resources');
const updateRoutes = require('./routes/updates');
const verificationRoutes = require('./routes/verification');
const geocodingRoutes = require('./routes/geocoding');

// Import services
const { logger } = require('./utils/logger');
const { initializeSupabase } = require('./services/supabase');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' ? false : "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 5000;

// Initialize Supabase
initializeSupabase();

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

// Check if build directory exists before serving static files
const buildPath = path.join(__dirname, 'client/build');
const indexPath = path.join(buildPath, 'index.html');

if (require('fs').existsSync(buildPath)) {
  app.use(express.static(buildPath));
  logger.info('Static files directory found, serving React app');
} else {
  logger.warn('Build directory not found. Run "npm run build" in the client directory to build the React app');
}

// Routes
app.use('/api/disasters', disasterRoutes);
app.use('/api/social-media', socialMediaRoutes);
app.use('/api/resources', resourceRoutes);
app.use('/api/updates', updateRoutes);
app.use('/api/verification', verificationRoutes);
app.use('/api/geocoding', geocodingRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV 
  });
});

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

// Socket.IO connection handling
io.on('connection', (socket) => {
  logger.info(`Client connected: ${socket.id}`);

  socket.on('join-disaster', (disasterId) => {
    socket.join(`disaster-${disasterId}`);
    logger.info(`Client ${socket.id} joined disaster room: ${disasterId}`);
  });

  socket.on('leave-disaster', (disasterId) => {
    socket.leave(`disaster-${disasterId}`);
    logger.info(`Client ${socket.id} left disaster room: ${disasterId}`);
  });

  socket.on('disconnect', () => {
    logger.info(`Client disconnected: ${socket.id}`);
  });
});

// Make io available to routes
app.set('io', io);

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

server.listen(PORT, () => {
  logger.info(`🚀 Disaster Response Platform server running on port ${PORT}`);
  logger.info(`📡 WebSocket server ready for real-time updates`);
  logger.info(`🌍 Environment: ${process.env.NODE_ENV}`);
});

module.exports = { app, server, io }; 