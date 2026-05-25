import express from 'express';
import * as authController from '../controllers/authController.js';
import { requireLogin } from '../middlewares/auth.js';

const router = express.Router();

// Login
router.post('/login', authController.login);

// Logout
router.post('/logout', authController.logout);

// Get current user
router.get('/me', requireLogin, authController.getCurrentUser);

// Register (optional, for system setup)
router.post('/register', authController.register);

export default router;
