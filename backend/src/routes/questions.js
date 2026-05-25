import express from 'express';
import * as questionsController from '../controllers/questionsController.js';
import { requireLogin, requirePermission } from '../middlewares/auth.js';

const router = express.Router();

// Get all questions (paginated)
router.get('/', questionsController.getQuestions);

// Create question (admin only)
router.post('/', requireLogin, requirePermission('admin'), questionsController.createQuestion);

// Get question by ID
router.get('/:id', questionsController.getQuestionById);

// Update question (admin only)
router.put('/:id', requireLogin, requirePermission('admin'), questionsController.updateQuestion);

// Delete question (admin only)
router.delete('/:id', requireLogin, requirePermission('admin'), questionsController.deleteQuestion);

export default router;
