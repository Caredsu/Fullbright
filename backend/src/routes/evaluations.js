import express from 'express';
import * as evaluationsController from '../controllers/evaluationsController.js';
import { requireLogin, requirePermission } from '../middlewares/auth.js';

const router = express.Router();

// Get evaluations (paginated)
router.get('/', evaluationsController.getEvaluations);

// Check for new evaluations (polling)
router.get('/check-new', evaluationsController.checkNewEvaluations);

// Check evaluated teachers for a student (per-student duplicate prevention)
router.get('/check-evaluated-teachers', evaluationsController.checkEvaluatedTeachers);

// Clear evaluation (admin only)
router.post('/clear', requireLogin, requirePermission('admin'), evaluationsController.clearEvaluation);

// Export to PDF
router.get('/export-pdf', requireLogin, evaluationsController.exportPDF);

// Get evaluation by ID
router.get('/:id', evaluationsController.getEvaluationById);

// Create evaluation (students don't need to be logged in)
router.post('/', evaluationsController.createEvaluation);

// Update evaluation
router.put('/:id', requireLogin, evaluationsController.updateEvaluation);

// Delete evaluation
router.delete('/:id', requireLogin, evaluationsController.deleteEvaluation);

export default router;
