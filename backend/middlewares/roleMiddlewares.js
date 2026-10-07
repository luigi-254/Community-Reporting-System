/**
 * Role-based authorization middleware
 * @param  {...string} allowedRoles
 */
export const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        status: 'error',
        message: 'Authentication required prior to role verification.',
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        status: 'error',
        message: `Forbidden: role '${req.user.role}' does not have access to this resource.`,
      });
    }

    next();
  };
};

export default {
  authorizeRoles,
};
