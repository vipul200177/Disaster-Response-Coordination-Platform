const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

// Create a simple logger for serverless environment
const logger = {
  info: (...args) => console.log('[INFO]', ...args),
  warn: (...args) => console.warn('[WARN]', ...args),
  error: (...args) => console.error('[ERROR]', ...args),
  debug: (...args) => console.log('[DEBUG]', ...args)
};

const app = express();

// Trust proxy for rate limiting
app.set('trust proxy', 1);

// Middleware
app.use(helmet());
app.use(cors({
  origin: true,
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);

// Body parsing middleware
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

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    service: 'disaster-response-platform'
  });
});

// Mock API endpoints for serverless deployment
app.get('/api/disasters', (req, res) => {
  res.json({
    disasters: [
      {
        id: 'test-disaster-1',
        title: 'Test Disaster Response',
        description: 'This is a test disaster for demonstration purposes',
        status: 'active',
        severity: 'medium',
        location: 'Test Location',
        created_at: new Date().toISOString()
      }
    ],
    message: 'Mock disaster data - serverless deployment'
  });
});

app.get('/api/test', (req, res) => {
  res.json({
    message: 'Serverless function is working!',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    service: 'disaster-response-platform'
  });
});

// Catch-all route for SPA
app.get('*', (req, res) => {
  res.json({
    message: 'Disaster Response Platform - Serverless Deployment',
    status: 'running',
    timestamp: new Date().toISOString(),
    note: 'This is a serverless deployment. For full functionality, run locally.',
    local_url: 'http://localhost:5000',
    github: 'https://github.com/vipul200177/Disaster-Response-Coordination-Platform.git'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: 'Something went wrong on the server',
    timestamp: new Date().toISOString()
  });
});

module.exports = app; 