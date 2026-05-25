import express from 'express';
import { uploadToCloudinary, deleteFromCloudinary } from '../config/cloudinary.js';
import { uploadMiddleware } from '../middlewares/uploadMiddleware.js';
import { requireLogin } from '../middlewares/auth.js';

const router = express.Router();

/**
 * Upload teacher profile image
 * POST /api/upload/teacher-profile
 * 
 * @param {File} file - Image file from form data
 * @returns {Object} { url, publicId }
 */
router.post('/teacher-profile', requireLogin, uploadMiddleware.single('profileImage'), async (req, res) => {
  try {
    // Check if file exists
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    // Upload to Cloudinary
    const uploadResult = await uploadToCloudinary(
      req.file.buffer,
      req.file.originalname
    );

    res.json({
      success: true,
      data: {
        url: uploadResult.url,
        publicId: uploadResult.publicId,
        size: uploadResult.size,
        width: uploadResult.width,
        height: uploadResult.height
      }
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ 
      error: 'Failed to upload image',
      details: error.message 
    });
  }
});

/**
 * Delete teacher profile image
 * DELETE /api/upload/teacher-profile/:publicId
 */
router.delete('/teacher-profile/:publicId', requireLogin, async (req, res) => {
  try {
    const { publicId } = req.params;
    
    if (!publicId) {
      return res.status(400).json({ error: 'Public ID is required' });
    }

    await deleteFromCloudinary(publicId);

    res.json({ 
      success: true, 
      message: 'Image deleted successfully' 
    });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ 
      error: 'Failed to delete image',
      details: error.message 
    });
  }
});

export default router;
