import { Router } from 'express';
import { generatePrediction, getPredictions } from '../controllers/predictionController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = Router();

router.use(authMiddleware);
router.post('/generate', generatePrediction);
router.get('/', getPredictions);

export default router;
