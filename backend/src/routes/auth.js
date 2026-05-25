import express from 'express';
import * as authController from '../controllers/authController.js';
import { requireLogin } from '../middlewares/auth.js';

const router = express.Router();

// Login (admin/staff)
router.post('/login', authController.login);

// Logout
router.post('/logout', authController.logout);

// 🔄 Refresh access token (for both admin and student)
router.post('/refresh', authController.refreshToken);

// 🎓 Student direct access with JWT
router.post('/student-login', authController.studentLogin);

// 🔐 Change password (requires authentication)
router.post('/change-password', requireLogin, authController.changePassword);

// Get current user
router.get('/me', requireLogin, authController.getCurrentUser);

// Register (optional, for system setup)
router.post('/register', authController.register);

export default router;
