import express from 'express';
import * as analyticsController from '../controllers/analyticsController.js';

const router = express.Router();

// Get dashboard analytics (main overview)
router.get('/dashboard', analyticsController.getDashboard);

// Get detailed analytics with filters
router.get('/', analyticsController.getAnalytics);

export default router;
