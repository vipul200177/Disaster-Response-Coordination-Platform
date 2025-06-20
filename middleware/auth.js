const { logger } = require('../utils/logger');

// Mock user database
const mockUsers = {
  'netrunnerX': {
    id: 'netrunnerX',
    username: 'netrunnerX',
    role: 'admin',
    permissions: ['read', 'write', 'delete', 'admin'],
    email: 'netrunner@disaster-response.org'
  },
  'reliefAdmin': {
    id: 'reliefAdmin',
    username: 'reliefAdmin',
    role: 'admin',
    permissions: ['read', 'write', 'delete', 'admin'],
    email: 'admin@redcross.org'
  },
  'fieldWorker': {
    id: 'fieldWorker',
    username: 'fieldWorker',
    role: 'contributor',
    permissions: ['read', 'write'],
    email: 'worker@disaster-response.org'
  },
  'volunteer': {
    id: 'volunteer',
    username: 'volunteer',
    role: 'volunteer',
    permissions: ['read'],
    email: 'volunteer@disaster-response.org'
  },
  'citizen1': {
    id: 'citizen1',
    username: 'citizen1',
    role: 'citizen',
    permissions: ['read'],
    email: 'citizen@example.com'
  }
};

// Authentication middleware
const authenticateUser = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return res.status(401).json({ 
      error: 'Authentication required',
      message: 'Please provide Authorization header'
    });
  }

  // Extract username from Authorization header (format: "Bearer username")
  const token = authHeader.replace('Bearer ', '');
  
  if (!mockUsers[token]) {
    return res.status(401).json({ 
      error: 'Invalid credentials',
      message: 'User not found'
    });
  }

  // Add user to request object
  req.user = mockUsers[token];
  logger.info(`User authenticated: ${req.user.username} (${req.user.role})`);
  
  next();
};

// Role-based authorization middleware
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Authentication required',
        message: 'Please authenticate first'
      });
    }

    const userRole = req.user.role;
    const allowedRoles = Array.isArray(roles) ? roles : [roles];

    if (!allowedRoles.includes(userRole)) {
      logger.warn(`Access denied: User ${req.user.username} (${userRole}) tried to access ${req.method} ${req.path}`);
      return res.status(403).json({ 
        error: 'Access denied',
        message: `Role ${userRole} is not authorized for this operation`,
        required_roles: allowedRoles
      });
    }

    next();
  };
};

// Permission-based authorization middleware
const requirePermission = (permissions) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Authentication required',
        message: 'Please authenticate first'
      });
    }

    const userPermissions = req.user.permissions;
    const requiredPermissions = Array.isArray(permissions) ? permissions : [permissions];

    const hasAllPermissions = requiredPermissions.every(permission => 
      userPermissions.includes(permission)
    );

    if (!hasAllPermissions) {
      logger.warn(`Permission denied: User ${req.user.username} tried to access ${req.method} ${req.path}`);
      return res.status(403).json({ 
        error: 'Permission denied',
        message: 'Insufficient permissions for this operation',
        required_permissions: requiredPermissions,
        user_permissions: userPermissions
      });
    }

    next();
  };
};

// Ownership check middleware
const checkOwnership = (req, res, next) => {
  const resourceOwnerId = req.params.owner_id || req.body.owner_id;
  
  if (!resourceOwnerId) {
    return next(); // No ownership check needed
  }

  if (!req.user) {
    return res.status(401).json({ 
      error: 'Authentication required',
      message: 'Please authenticate first'
    });
  }

  // Admins can access any resource
  if (req.user.role === 'admin') {
    return next();
  }

  // Users can only access their own resources
  if (req.user.id !== resourceOwnerId) {
    logger.warn(`Ownership check failed: User ${req.user.username} tried to access resource owned by ${resourceOwnerId}`);
    return res.status(403).json({ 
      error: 'Access denied',
      message: 'You can only access your own resources'
    });
  }

  next();
};

// Rate limiting per user
const userRateLimit = (windowMs = 60000, maxRequests = 100) => {
  const userRequests = new Map();

  return (req, res, next) => {
    if (!req.user) {
      return next(); // Skip rate limiting for unauthenticated requests
    }

    const userId = req.user.id;
    const now = Date.now();
    
    if (!userRequests.has(userId)) {
      userRequests.set(userId, { count: 0, resetTime: now + windowMs });
    }

    const userData = userRequests.get(userId);
    
    // Reset counter if window has passed
    if (now > userData.resetTime) {
      userData.count = 0;
      userData.resetTime = now + windowMs;
    }

    userData.count++;

    if (userData.count > maxRequests) {
      logger.warn(`Rate limit exceeded for user: ${req.user.username}`);
      return res.status(429).json({ 
        error: 'Rate limit exceeded',
        message: `Too many requests. Limit: ${maxRequests} per ${windowMs/1000} seconds`,
        retry_after: Math.ceil((userData.resetTime - now) / 1000)
      });
    }

    // Add rate limit headers
    res.set({
      'X-RateLimit-Limit': maxRequests,
      'X-RateLimit-Remaining': maxRequests - userData.count,
      'X-RateLimit-Reset': userData.resetTime
    });

    next();
  };
};

// Audit logging middleware
const auditLog = (action) => {
  return (req, res, next) => {
    const originalSend = res.send;
    
    res.send = function(data) {
      // Log the action after response is sent
      if (req.user) {
        logger.info('Audit log', {
          action,
          user_id: req.user.id,
          username: req.user.username,
          role: req.user.role,
          method: req.method,
          path: req.path,
          status_code: res.statusCode,
          timestamp: new Date().toISOString(),
          ip: req.ip || req.connection.remoteAddress
        });
      }
      
      originalSend.call(this, data);
    };
    
    next();
  };
};

// Get user info endpoint helper
const getUserInfo = (userId) => {
  return mockUsers[userId] || null;
};

// List all users (admin only)
const getAllUsers = () => {
  return Object.values(mockUsers).map(user => ({
    id: user.id,
    username: user.username,
    role: user.role,
    email: user.email
  }));
};

module.exports = {
  authenticateUser,
  requireRole,
  requirePermission,
  checkOwnership,
  userRateLimit,
  auditLog,
  getUserInfo,
  getAllUsers,
  mockUsers
}; 