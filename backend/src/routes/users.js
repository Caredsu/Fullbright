import express from 'express';
import {
  getUsers,
  createUser,
  updateUser,
  deleteUser
} from '../controllers/usersController.js';

const router = express.Router();

// Get all users
router.get('/', getUsers);

// Create user
router.post('/', createUser);

// Get user by ID
router.get('/:id', (req, res) => {
  res.json({ success: true, message: 'User found' });
});

// Update user
router.put('/:id', updateUser);

// Delete user
router.delete('/:id', deleteUser);

export default router;
