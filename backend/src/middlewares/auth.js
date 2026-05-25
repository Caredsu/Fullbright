export const requireLogin = (req, res, next) => {
  if (!req.session || !req.session.user_id) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized - Please login first'
    });
  }
  next();
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
