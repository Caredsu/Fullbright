import multer from 'multer';

/**
 * Multer configuration for handling image uploads
 * Stores files in memory before sending to Cloudinary
 */

// Use memory storage since we're uploading to Cloudinary
const storage = multer.memoryStorage();

// File filter - only accept images
const fileFilter = (req, file, cb) => {
  const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed (JPEG, PNG, GIF, WebP)'), false);
  }
};

// Multer configuration
export const uploadMiddleware = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: fileFilter
});

/**
 * Handle multer errors
 */
export const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File size exceeds 5MB limit' });
    }
  }
  if (err) {
    return res.status(400).json({ error: err.message });
  }
  next();
};
