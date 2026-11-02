import Prediction from '../models/Prediction.js';
import Sales from '../models/Sales.js';
import { getLocalStore, isLocalMode, createLocalId } from '../utils/localStore.js';

export const generatePrediction = async (req, res, next) => {
  try {
    const productName = req.body.productName || 'all';
    const forecastPeriod = req.body.forecastPeriod || '7d';

    let sales;
    if (isLocalMode()) {
      sales = getLocalStore().sales.filter((item) => item.userId === req.user._id && (productName === 'all' || item.productName === productName));
    } else {
      sales = await Sales.find({ userId: req.user._id, ...(productName !== 'all' ? { productName } : {}) }).sort({ date: 1 });
    }

    if (!sales.length) {
      return res.status(200).json({ success: true, message: 'No sales data available for prediction.', data: [] });
    }

    const recordsByProduct = {};
    sales.forEach((sale) => {
      const key = sale.productName;
      if (!recordsByProduct[key]) recordsByProduct[key] = [];
      recordsByProduct[key].push(sale);
    });

    const forecastResults = [];
    Object.entries(recordsByProduct).forEach(([name, list]) => {
      const averageDaily = list.reduce((sum, item) => sum + Number(item.quantitySold || 0), 0) / Math.max(list.length, 1);
      const multiplier = forecastPeriod === '30d' ? 30 : forecastPeriod === '15d' ? 15 : 7;
      const predictedQuantity = Math.max(Math.round(averageDaily * multiplier * 0.92), 0);
      const confidence = Math.min(0.92, Math.max(0.45, list.length / 10));

      forecastResults.push({
        userId: req.user._id,
        productName: name,
        forecastPeriod,
        predictedQuantity,
        confidence,
        notes: 'Forecast generated from recent historical sales volume.',
      });
    });

    if (isLocalMode()) {
      const localPredictions = forecastResults.map((item) => ({ ...item, _id: createLocalId(), createdAt: new Date().toISOString() }));
      getLocalStore().predictions.push(...localPredictions);
      return res.status(201).json({ success: true, data: localPredictions });
    }

    const saved = [];
    for (const data of forecastResults) {
      saved.push(await Prediction.create(data));
    }

    res.status(201).json({ success: true, data: saved });
  } catch (error) {
    next(error);
  }
};

export const getPredictions = async (req, res, next) => {
  try {
    if (isLocalMode()) {
      const predictions = getLocalStore().predictions.filter((item) => item.userId === req.user._id).sort((a, b) => new Date(b.createdAt || Date.now()) - new Date(a.createdAt || Date.now()));
      return res.status(200).json({ success: true, data: predictions });
    }

    const predictions = await Prediction.find({ userId: req.user._id }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: predictions });
  } catch (error) {
    next(error);
  }
};
