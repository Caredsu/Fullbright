import express from 'express';
import * as teachersController from '../controllers/teachersController.js';
import { requireLogin, requirePermission } from '../middlewares/auth.js';

const router = express.Router();

// Get all teachers (with pagination)
router.get('/', teachersController.getTeachers);

// Get teacher by ID
router.get('/:id', teachersController.getTeacherById);

// Create teacher (admin only)
router.post('/', requireLogin, requirePermission('admin'), teachersController.createTeacher);

// Update teacher (admin only)
router.put('/:id', requireLogin, requirePermission('admin'), teachersController.updateTeacher);

// Delete teacher (admin only)
router.delete('/:id', requireLogin, requirePermission('admin'), teachersController.deleteTeacher);

// Upload teacher image
router.post('/upload', (req, res, next) => {
  const upload = req.app.locals.upload;
  upload.single('image')(req, res, (err) => {
    if (err) {
      return res.status(400).json({
        success: false,
        message: err.message
      });
    }
    next();
  });
}, teachersController.uploadTeacherImage);

export default router;
