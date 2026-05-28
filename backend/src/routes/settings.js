import express from 'express';
import { getSettings, updateSettings } from '../controllers/settingsController.js';
import { requireLogin, requirePermission } from '../middlewares/auth.js';

const router = express.Router();

// Get settings (public)
router.get('/', getSettings);

// Update settings (admin or super_admin)
router.put('/', requireLogin, requirePermission(['admin', 'super_admin']), updateSettings);

export default router;
