import express from 'express';
import * as surveysController from '../controllers/surveysController.js';
import { requireLogin } from '../middlewares/auth.js';

const router = express.Router();

// Get TAM surveys
router.get('/', surveysController.getTAMSurveys);

// Export TAM surveys to CSV
router.get('/tam-export', surveysController.exportTAMSurvey);

// Submit TAM survey
router.post('/submit', requireLogin, surveysController.submitTAMSurvey);

export default router;
