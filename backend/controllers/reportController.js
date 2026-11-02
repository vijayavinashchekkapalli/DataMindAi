import Report from '../models/Report.js';
import Sales from '../models/Sales.js';
import { getLocalStore, isLocalMode, createLocalId } from '../utils/localStore.js';

export const generateReport = async (req, res, next) => {
  try {
    const { reportType = 'sales-summary', format = 'pdf' } = req.body;

    let sales;
    if (isLocalMode()) {
      sales = getLocalStore().sales.filter((item) => item.userId === req.user._id);
    } else {
      sales = await Sales.find({ userId: req.user._id }).sort({ date: -1 });
    }

    const totalRevenue = sales.reduce((sum, item) => sum + Number(item.totalSales || 0), 0);
    const totalUnits = sales.reduce((sum, item) => sum + Number(item.quantitySold || 0), 0);

    if (isLocalMode()) {
      const report = {
        _id: createLocalId(),
        userId: req.user._id,
        reportType,
        format,
        fileName: `${reportType}-${Date.now()}.${format}`,
        filePath: `/reports/${reportType}-${Date.now()}.${format}`,
        createdAt: new Date().toISOString(),
      };
      getLocalStore().reports.push(report);
      return res.status(201).json({ success: true, message: 'Report generated successfully.', data: { id: report._id, reportType, format, fileName: report.fileName, summary: { totalRevenue, totalUnits, recordCount: sales.length } } });
    }

    const report = await Report.create({
      userId: req.user._id,
      reportType,
      format,
      fileName: `${reportType}-${Date.now()}.${format}`,
      filePath: `/reports/${reportType}-${Date.now()}.${format}`,
    });

    res.status(201).json({
      success: true,
      message: 'Report generated successfully.',
      data: {
        id: report._id,
        reportType,
        format,
        fileName: report.fileName,
        summary: {
          totalRevenue,
          totalUnits,
          recordCount: sales.length,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getReports = async (req, res, next) => {
  try {
    if (isLocalMode()) {
      const reports = getLocalStore().reports.filter((item) => item.userId === req.user._id).sort((a, b) => new Date(b.createdAt || Date.now()) - new Date(a.createdAt || Date.now()));
      return res.status(200).json({ success: true, data: reports });
    }

    const reports = await Report.find({ userId: req.user._id }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: reports });
  } catch (error) {
    next(error);
  }
};
