import { Router } from 'express';
import { cleanFile, getCleaningHistory } from '../controllers/cleaningController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = Router();

router.use(authMiddleware);
router.get('/history', getCleaningHistory);
router.post('/:fileId', cleanFile);
router.post('/:fileId/clean', cleanFile);
router.get('/:fileId/history', getCleaningHistory);

export default router;
