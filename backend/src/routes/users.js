import express from 'express';
import {
  getUsers,
  createUser,
  updateUser,
  deleteUser
} from '../controllers/usersController.js';
import { requireLogin, requirePermission } from '../middlewares/auth.js';

const router = express.Router();

// Get all users - admin or super_admin
router.get('/', requireLogin, requirePermission(['admin', 'super_admin']), getUsers);

// Create user - admin or super_admin
router.post('/', requireLogin, requirePermission(['admin', 'super_admin']), createUser);

// Get user by ID
router.get('/:id', (req, res) => {
  res.json({ success: true, message: 'User found' });
});

// Update user - admin or super_admin
router.put('/:id', requireLogin, requirePermission(['admin', 'super_admin']), updateUser);

// Delete user - admin or super_admin
router.delete('/:id', requireLogin, requirePermission(['admin', 'super_admin']), deleteUser);

export default router;
