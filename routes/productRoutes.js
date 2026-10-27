import { Router } from 'express';
import {
  createProduct,
  deleteProduct,
  getMyListings,
  getPendingVerification,
  getProduct,
  getProducts,
  setVerification,
  updateProduct,
} from '../controllers/productController.js';
import { adminOnly, optionalAuth, protect } from '../middleware/auth.js';

const router = Router();

router.get('/', getProducts);
router.post('/', protect, createProduct);

// Fixed paths must be declared before '/:id'
router.get('/mine/listings', protect, getMyListings);
router.get('/admin/pending', protect, adminOnly, getPendingVerification);

router.get('/:id', optionalAuth, getProduct);
router.put('/:id', protect, updateProduct);
router.delete('/:id', protect, deleteProduct);
router.put('/:id/verification', protect, adminOnly, setVerification);

export default router;
