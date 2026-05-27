import express from 'express';
import {
  getUsers,
  createUser,
  updateUser,
  deleteUser
} from '../controllers/usersController.js';
import { requireLogin, requirePermission } from '../middlewares/auth.js';

const router = express.Router();

// Get all users - super_admin only
router.get('/', requireLogin, requirePermission('super_admin'), getUsers);

// Create user - super_admin only
router.post('/', requireLogin, requirePermission('super_admin'), createUser);

// Get user by ID
router.get('/:id', (req, res) => {
  res.json({ success: true, message: 'User found' });
});

// Update user - super_admin only
router.put('/:id', requireLogin, requirePermission('super_admin'), updateUser);

// Delete user - super_admin only
router.delete('/:id', requireLogin, requirePermission('super_admin'), deleteUser);

export default router;
