export const requireLogin = (req, res, next) => {
  // Check session first (for server-to-server requests)
  if (req.session && req.session.user_id) {
    return next();
  }

  // Check Bearer token (for cross-domain frontend requests)
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (token && token.length > 0) {
    // Token exists, store it in session for permission checks
    req.session = req.session || {};
    req.session.user_id = token;
    return next();
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
