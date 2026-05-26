import express from 'express';
import { getSettings, updateSettings } from '../controllers/settingsController.js';
import { requireLogin } from '../middlewares/auth.js';

const router = express.Router();

// Get settings (public)
router.get('/', getSettings);

// Update settings (admin only)
router.put('/', requireLogin, updateSettings);

export default router;
