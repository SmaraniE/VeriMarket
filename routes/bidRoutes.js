import { Router } from 'express';
import { getMyBids, getProductBids, placeBid } from '../controllers/bidController.js';
import { protect } from '../middleware/auth.js';

const router = Router();

router.get('/mine', protect, getMyBids);
router.get('/product/:productId', getProductBids);
router.post('/:productId', protect, placeBid);

export default router;
