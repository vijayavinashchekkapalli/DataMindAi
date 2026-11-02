import { Router } from 'express';
import { getRecommendations } from '../controllers/recommendationController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = Router();

router.use(authMiddleware);
router.get('/', getRecommendations);

export default router;
