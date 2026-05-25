import express from 'express';

const router = express.Router();

// Get all departments
router.get('/', (req, res) => {
  res.json({ success: true, message: 'Departments endpoint', data: ['ECT', 'EDUC', 'CCJE', 'BHT'] });
});

export default router;
