import Sales from '../models/Sales.js';
import { getLocalStore, isLocalMode } from '../utils/localStore.js';

export const getRecommendations = async (req, res, next) => {
  try {
    let sales;
    if (isLocalMode()) {
      sales = getLocalStore().sales.filter((item) => item.userId === req.user._id).sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 200);
    } else {
      sales = await Sales.find({ userId: req.user._id }).sort({ date: -1 }).limit(200);
    }

    if (!sales.length) {
      return res.status(200).json({ success: true, data: [] });
    }

    const grouped = {};
    sales.forEach((sale) => {
      grouped[sale.productName] = (grouped[sale.productName] || 0) + Number(sale.totalSales || 0);
    });

    const topProduct = Object.entries(grouped).sort((a, b) => b[1] - a[1])[0] || ['', 0];
    const recommendations = [
      {
        title: 'Promote your top-selling product',
        description: `${topProduct[0]} is contributing the largest share of revenue.`,
        reason: 'Demand remains strong in your recent sales data.',
        metrics: { revenue: topProduct[1] },
        suggestedAction: 'Increase display space and promotional bundles for this product.',
      },
      {
        title: 'Review slow moving items',
        description: 'Compare recent sales with earlier weeks to identify items that show declining momentum.',
        reason: 'Some products may need pricing or bundle adjustments.',
        metrics: { focus: 'Product assortment' },
        suggestedAction: 'Revise pricing or reposition slowly moving stock.',
      },
      {
        title: 'Expand high-performing categories',
        description: 'Focus on categories with consistent growth in the last 30 days.',
        reason: 'Category-level trend analysis shows sustained demand.',
        metrics: { categoryLift: 'Monitor weekly' },
        suggestedAction: 'Allocate more stock and marketing budget to high-performing categories.',
      },
    ];

    res.status(200).json({ success: true, data: recommendations });
  } catch (error) {
    next(error);
  }
};
