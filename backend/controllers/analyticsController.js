import mongoose from 'mongoose';
import Sales from '../models/Sales.js';
import Business from '../models/Business.js';
import { getLocalStore, isLocalMode } from '../utils/localStore.js';
import { formatWeeklyRevenue, groupWeeklyRevenue, resolveDateRange } from '../services/analyticsService.js';

const getBusinessId = async (userId) => {
  if (isLocalMode()) {
    return getLocalStore().businesses.find((business) => (
      String(business.userId) === String(userId)
    ))?._id || null;
  }
  return (await Business.findOne({ userId }).select('_id').lean())?._id || null;
};

const getMongoScope = (userId, businessId) => ({
  userId,
  ...(businessId ? { businessId } : {}),
});

const getLocalSales = (userId, businessId, range = null) => getLocalStore().sales.filter((sale) => {
  if (String(sale.userId) !== String(userId)) return false;
  if (businessId && String(sale.businessId) !== String(businessId)) return false;
  if (!range) return true;
  const date = new Date(sale.date);
  return !Number.isNaN(date.getTime()) && date >= range.start && date < range.end;
});

const getSalesInRange = async (userId, businessId, range) => {
  if (isLocalMode()) return getLocalSales(userId, businessId, range);
  return Sales.find({
    ...getMongoScope(userId, businessId),
    date: { $gte: range.start, $lt: range.end },
  }).sort({ date: 1 });
};

export const overview = async (req, res, next) => {
  try {
    const range = resolveDateRange(req.query);
    const businessId = await getBusinessId(req.user._id);
    const sales = await getSalesInRange(req.user._id, businessId, range);

    const totalRevenue = sales.reduce((sum, item) => sum + (Number(item.totalSales) || 0), 0);
    const totalProductsSold = sales.reduce((sum, item) => sum + (Number(item.quantitySold) || 0), 0);
    const totalTransactions = sales.length;
    const averageTransactionValue = totalTransactions ? totalRevenue / totalTransactions : 0;

    const products = {};
    sales.forEach((item) => {
      const name = item.productName;
      products[name] = (products[name] || 0) + Number(item.totalSales || 0);
    });

    const topProducts = Object.entries(products)
      .map(([name, revenue]) => ({ name, revenue }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    const recentSales = sales
      .slice()
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 5)
      .map((sale) => ({
        productName: sale.productName,
        quantitySold: Number(sale.quantitySold) || 0,
        totalSales: Number(sale.totalSales) || 0,
        date: sale.date,
      }));

    return res.status(200).json({
      success: true,
      data: { totalRevenue, totalProductsSold, totalTransactions, averageTransactionValue, topProducts, recentSales },
    });
  } catch (error) {
    return next(error);
  }
};

export const salesTrends = async (req, res, next) => {
  try {
    const range = resolveDateRange(req.query);
    const businessId = await getBusinessId(req.user._id);
    const sales = await getSalesInRange(req.user._id, businessId, range);
    const dailyMap = new Map();

    sales.forEach((item) => {
      const dateKey = new Date(item.date).toISOString().slice(0, 10);
      dailyMap.set(dateKey, (dailyMap.get(dateKey) || 0) + Number(item.totalSales || 0));
    });

    return res.status(200).json({
      success: true,
      data: [...dailyMap.entries()].map(([date, revenue]) => ({ date, revenue })),
    });
  } catch (error) {
    return next(error);
  }
};

export const weeklyRevenue = async (req, res, next) => {
  try {
    const range = resolveDateRange(req.query);
    const businessId = await getBusinessId(req.user._id);

    if (isLocalMode()) {
      const sales = getLocalSales(req.user._id, businessId, range);
      return res.status(200).json({ success: true, data: groupWeeklyRevenue(sales) });
    }

    const match = {
      ...getMongoScope(new mongoose.Types.ObjectId(String(req.user._id)), businessId),
      date: { $gte: range.start, $lt: range.end },
    };
    const groups = await Sales.aggregate([
      { $match: match },
      {
        $set: {
          weekStart: {
            $dateTrunc: {
              date: '$date',
              unit: 'week',
              startOfWeek: 'monday',
              timezone: 'UTC',
            },
          },
        },
      },
      {
        $group: {
          _id: '$weekStart',
          revenue: { $sum: '$totalSales' },
          quantitySold: { $sum: '$quantitySold' },
          transactions: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          weekStart: '$_id',
          revenue: 1,
          quantitySold: 1,
          transactions: 1,
        },
      },
      { $sort: { weekStart: 1 } },
    ]);

    return res.status(200).json({ success: true, data: formatWeeklyRevenue(groups) });
  } catch (error) {
    return next(error);
  }
};

export const topProducts = async (req, res, next) => {
  try {
    const businessId = await getBusinessId(req.user._id);
    let products;
    if (isLocalMode()) {
      const sales = getLocalSales(req.user._id, businessId);
      const grouped = {};
      sales.forEach((item) => {
        grouped[item.productName] = {
          productName: item.productName,
          units: (grouped[item.productName]?.units || 0) + Number(item.quantitySold || 0),
          revenue: (grouped[item.productName]?.revenue || 0) + Number(item.totalSales || 0),
        };
      });
      products = Object.values(grouped)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5)
        .map((item) => ({ name: item.productName, units: item.units, revenue: item.revenue }));
    } else {
      products = await Sales.aggregate([
        { $match: getMongoScope(new mongoose.Types.ObjectId(String(req.user._id)), businessId) },
        { $group: { _id: '$productName', units: { $sum: '$quantitySold' }, revenue: { $sum: '$totalSales' } } },
        { $sort: { revenue: -1 } },
        { $limit: 5 },
      ]);
      products = products.map((item) => ({ name: item._id, revenue: item.revenue, units: item.units }));
    }

    return res.status(200).json({ success: true, data: products });
  } catch (error) {
    return next(error);
  }
};

export const categories = async (req, res, next) => {
  try {
    const businessId = await getBusinessId(req.user._id);
    if (isLocalMode()) {
      const sales = getLocalSales(req.user._id, businessId);
      const summary = new Map();
      sales.forEach((sale) => {
        const category = sale.category || 'General';
        const item = summary.get(category) || { _id: category, revenue: 0, units: 0 };
        item.revenue += Number(sale.totalSales || 0);
        item.units += Number(sale.quantitySold || 0);
        summary.set(category, item);
      });
      return res.status(200).json({ success: true, data: [...summary.values()] });
    }

    const summary = await Sales.aggregate([
      { $match: getMongoScope(new mongoose.Types.ObjectId(String(req.user._id)), businessId) },
      { $group: { _id: '$category', revenue: { $sum: '$totalSales' }, units: { $sum: '$quantitySold' } } },
    ]);

    return res.status(200).json({ success: true, data: summary });
  } catch (error) {
    return next(error);
  }
};

export const profit = async (req, res, next) => {
  try {
    const businessId = await getBusinessId(req.user._id);
    if (isLocalMode()) {
      const sales = getLocalSales(req.user._id, businessId).filter((sale) => sale.purchaseCost !== null);
      const totalRevenue = sales.reduce((sum, sale) => sum + Number(sale.totalSales || 0), 0);
      const totalCost = sales.reduce((sum, sale) => sum + Number(sale.purchaseCost || 0) * Number(sale.quantitySold || 0), 0);
      return res.status(200).json({ success: true, data: { totalRevenue, totalCost, profit: totalRevenue - totalCost } });
    }

    const summary = await Sales.aggregate([
      { $match: { ...getMongoScope(new mongoose.Types.ObjectId(String(req.user._id)), businessId), purchaseCost: { $ne: null } } },
      { $group: { _id: null, totalRevenue: { $sum: '$totalSales' }, totalCost: { $sum: { $multiply: ['$purchaseCost', '$quantitySold'] } } } },
    ]);

    const result = summary[0] || { totalRevenue: 0, totalCost: 0 };
    result.profit = result.totalRevenue - result.totalCost;
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    return next(error);
  }
};
