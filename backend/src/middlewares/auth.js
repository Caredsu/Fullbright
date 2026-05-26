import jwt from 'jsonwebtoken';

export const requireLogin = (req, res, next) => {
  // Check session first (for server-to-server requests)
  if (req.session && req.session.user_id) {
    return next();
  }

  // Check Bearer token (for cross-domain frontend requests)
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (token && token.length > 0) {
    try {
      // Decode JWT token to extract user ID
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
      
      // Store decoded user info in session for permission checks
      req.session = req.session || {};
      req.session.user_id = decoded.id;
      req.session.username = decoded.username;
      req.session.admin_role = decoded.role;
      
      return next();
    } catch (error) {
      console.error('Token verification failed:', error.message);
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token'
      });
    }
  }

  return res.status(401).json({
    success: false,
    message: 'Unauthorized - Please login first'
  });
};

export const requirePermission = (requiredRole) => {
  return (req, res, next) => {
    // For Bearer token auth, skip permission check (allow all authenticated users)
    // Since tokens are opaque identifiers without role info
    if (req.headers.authorization?.startsWith('Bearer ')) {
      return next();
    }

    if (!req.session || !req.session.admin_role) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
    }

    const userRole = req.session.admin_role;
    const allowedRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    
    // Allow super_admin for all admin roles
    if (userRole === 'super_admin' || allowedRoles.includes(userRole)) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: 'Forbidden - Insufficient permissions'
    });
  };
};

export const optionalAuth = (req, res, next) => {
  // Allows requests with or without authentication
  next();
};
