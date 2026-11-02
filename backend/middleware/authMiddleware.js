import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { getLocalStore, isLocalMode } from '../utils/localStore.js';

export const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

    if (!token) {
      return res.status(401).json({ success: false, message: 'Authentication token required.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (isLocalMode()) {
      const users = getLocalStore().users;
      const user = users.find((item) => item._id === decoded.id) || null;

      if (!user) {
        return res.status(401).json({ success: false, message: 'User not found.' });
      }

      req.user = {
        ...user,
        _id: user._id,
        passwordHash: user.passwordHash || undefined,
      };
      return next();
    }

    const user = await User.findById(decoded.id).select('-passwordHash');

    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found.' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token.' });
  }
};
