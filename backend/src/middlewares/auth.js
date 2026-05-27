import jwt from 'jsonwebtoken';

export const requireLogin = (req, res, next) => {
  // Check session first (for server-to-server requests)
  if (req.session && req.session.user_id) {
    console.log('✅ Auth via session:', { username: req.session.username, userId: req.session.user_id });
    return next();
  }

  // Check Bearer token (for cross-domain frontend requests)
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (token && token.length > 0) {
    try {
      // Decode JWT token to extract user ID
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
      console.log('🔑 JWT decoded:', { id: decoded.id, username: decoded.username, role: decoded.role });
      
      // Store decoded user info in session for permission checks
      req.session = req.session || {};
      req.session.user_id = decoded.id;
      req.session.username = decoded.username;
      req.session.admin_role = decoded.role;
      
      console.log('✅ Auth via JWT:', { username: req.session.username, userId: req.session.user_id });
      
      return next();
    } catch (error) {
      console.error('❌ Token verification failed:', error.message);
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token'
      });
    }
  }

  console.error('❌ No auth credentials found');
  return res.status(401).json({
    success: false,
    message: 'Unauthorized - Please login first'
  });
};

export const requirePermission = (requiredRole) => {
  return (req, res, next) => {
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
