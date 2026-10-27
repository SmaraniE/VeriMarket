import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
import { asyncHandler, HttpError } from '../middleware/error.js';

const router = Router();

// POST /api/upload/images - Accepts multiple images (up to 8) under field name 'images'
router.post(
  '/images',
  protect,
  upload.array('images', 8),
  asyncHandler(async (req, res) => {
    if (!req.files || req.files.length === 0) {
      throw new HttpError('Please select at least one image to upload', 400);
    }

    const urls = req.files.map((file) => `/uploads/${file.filename}`);
    res.json({ urls });
  })
);

export default router;
