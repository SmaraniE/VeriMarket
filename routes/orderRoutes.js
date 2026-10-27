import { Router } from 'express';
import {
  checkout,
  confirmDelivery,
  createRazorpayOrder,
  createReview,
  getMyOrders,
  getRazorpayKey,
  getSellerOrders,
  getSellerReviews,
  payOrder,
  shipOrder,
  verifyRazorpayPayment,
} from '../controllers/orderController.js';
import { protect } from '../middleware/auth.js';

const router = Router();

router.get('/seller/:sellerId/reviews', getSellerReviews); // public
router.get('/razorpay/key', getRazorpayKey); // get public key for frontend checkout
router.post('/razorpay/create-order', protect, createRazorpayOrder);
router.post('/razorpay/verify', protect, verifyRazorpayPayment);

router.post('/checkout', protect, checkout);
router.get('/mine', protect, getMyOrders);
router.get('/selling', protect, getSellerOrders);
router.put('/:id/pay', protect, payOrder);
router.put('/:id/ship', protect, shipOrder);
router.put('/:id/deliver', protect, confirmDelivery);
router.post('/:id/review', protect, createReview);

export default router;
