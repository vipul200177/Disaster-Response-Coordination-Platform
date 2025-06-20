const winston = require('winston');
const fs = require('fs');
const path = require('path');

// Ensure logs directory exists
const logsDir = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(logsDir)) {
  try {
    fs.mkdirSync(logsDir, { recursive: true });
  } catch (error) {
    console.warn('Could not create logs directory:', error.message);
  }
}

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Create transports array
const transports = [];

// Add file transports only if logs directory is writable
try {
  if (fs.existsSync(logsDir) && fs.statSync(logsDir).isDirectory()) {
    transports.push(
      new winston.transports.File({ filename: path.join(logsDir, 'error.log'), level: 'error' }),
      new winston.transports.File({ filename: path.join(logsDir, 'combined.log') })
    );
  }
} catch (error) {
  console.warn('Could not set up file logging:', error.message);
}

// Always add console transport for development
if (process.env.NODE_ENV !== 'production') {
  transports.push(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

// Create logger instance
const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: logFormat,
  defaultMeta: { service: 'disaster-response-platform' },
  transports: transports,
});

// Helper functions for structured logging
const logDisasterAction = (action, disasterId, userId, details = {}) => {
  logger.info('Disaster action processed', {
    action,
    disasterId,
    userId,
    timestamp: new Date().toISOString(),
    ...details
  });
};

const logResourceMapped = (resourceName, location, disasterId) => {
  logger.info('Resource mapped', {
    resourceName,
    location,
    disasterId,
    timestamp: new Date().toISOString()
  });
};

const logSocialMediaProcessed = (platform, disasterId, postCount) => {
  logger.info('Social media processed', {
    platform,
    disasterId,
    postCount,
    timestamp: new Date().toISOString()
  });
};

const logGeocodingRequest = (locationName, coordinates, success) => {
  logger.info('Geocoding request', {
    locationName,
    coordinates,
    success,
    timestamp: new Date().toISOString()
  });
};

const logImageVerification = (disasterId, imageUrl, verificationStatus) => {
  logger.info('Image verification', {
    disasterId,
    imageUrl,
    verificationStatus,
    timestamp: new Date().toISOString()
  });
};

const logCacheOperation = (operation, key, hit) => {
  logger.debug('Cache operation', {
    operation,
    key,
    hit,
    timestamp: new Date().toISOString()
  });
};

module.exports = {
  logger,
  logDisasterAction,
  logResourceMapped,
  logSocialMediaProcessed,
  logGeocodingRequest,
  logImageVerification,
  logCacheOperation
}; 