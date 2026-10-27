import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

// Shared by HTTP middleware and the Socket.io handshake
export const userFromToken = async (token) => {
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return await User.findById(decoded.id);
  } catch {
    return null;
  }
};

const bearer = (req) => {
  const h = req.headers.authorization || '';
  return h.startsWith('Bearer ') ? h.slice(7) : null;
};

export const protect = async (req, res, next) => {
  const user = await userFromToken(bearer(req));
  if (!user) return res.status(401).json({ message: 'Please log in to continue' });
  req.user = user;
  next();
};

export const optionalAuth = async (req, res, next) => {
  req.user = await userFromToken(bearer(req));
  next();
};

export const adminOnly = (req, res, next) => {
  if (req.user?.role !== 'admin') return res.status(403).json({ message: 'Admin access required' });
  next();
};
