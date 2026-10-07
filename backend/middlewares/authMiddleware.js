import db from '../config/db.js';
import { verifyAccessToken } from '../utils/jwt.js';

export const authenticate = async (req, res, next) => {
  try {
    let token = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.cookies && req.cookies.accessToken) {
      // 2. Check cookies
      token = req.cookies.accessToken;
    }

    if (!token) {
      return res.status(401).json({
        status: 'error',
        message: 'Authentication required. No token provided.',
      });
    }

    const decoded = verifyAccessToken(token);
    if (!decoded || !decoded.id) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid or expired access token.',
      });
    }
    const user = await db.findUserById(decoded.id);
    if (!user) {
      return res.status(401).json({
        status: 'error',
        message: 'The user belonging to this token no longer exists.',
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        status: 'error',
        message: 'Account has been deactivated. Please contact support.',
      });
    }

    const { password, ...safeUser } = user;
    req.user = safeUser;

    next();
  } catch (error) {
    next(error);
  }
};

export const protect = authenticate;
export const authMiddleware = authenticate;

export default {
  authenticate,
  protect,
  authMiddleware,
};
