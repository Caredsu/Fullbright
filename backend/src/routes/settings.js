import express from 'express';
import { getSettings, updateSettings } from '../controllers/settingsController.js';
import { requireLogin, requirePermission } from '../middlewares/auth.js';

const router = express.Router();

// Get settings (public)
router.get('/', getSettings);

// Update settings (super_admin only)
router.put('/', requireLogin, requirePermission('super_admin'), updateSettings);

export default router;
