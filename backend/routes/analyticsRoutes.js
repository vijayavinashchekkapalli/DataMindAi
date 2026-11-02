import { Router } from 'express';
import { overview, salesTrends, weeklyRevenue, topProducts, categories, profit } from '../controllers/analyticsController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = Router();

router.use(authMiddleware);
router.get('/overview', overview);
router.get('/sales-trends', salesTrends);
router.get('/trends', salesTrends);
router.get('/weekly-revenue', weeklyRevenue);
router.get('/top-products', topProducts);
router.get('/categories', categories);
router.get('/profit', profit);

export default router;
