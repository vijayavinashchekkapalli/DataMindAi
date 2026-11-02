import { Router } from 'express';
import { generateReport, getReports } from '../controllers/reportController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = Router();

router.use(authMiddleware);
router.post('/generate', generateReport);
router.get('/', getReports);

export default router;
