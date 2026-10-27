import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { getMe, getWatchlist, login, register, toggleWatchlist, updateProfile, changePassword } from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';

const router = Router();
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many attempts. Please try again in a few minutes.' },
});

router.post('/register', limiter, register);
router.post('/login', limiter, login);
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);
router.put('/password', protect, changePassword);
router.get('/watchlist', protect, getWatchlist);
router.post('/watchlist/:productId', protect, toggleWatchlist);

export default router;
