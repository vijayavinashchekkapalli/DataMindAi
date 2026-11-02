import path from 'path';
import fs from 'fs';

import UploadedFile from '../models/UploadedFile.js';
import Sales from '../models/Sales.js';
import Business from '../models/Business.js';
import CleaningHistory from '../models/CleaningHistory.js';
import { getLocalStore, isLocalMode, createLocalId } from '../utils/localStore.js';
import { getFileType, getRowSignature, processSalesFile } from '../services/salesFileProcessor.js';
import { createCleaningPreview, getCleaningOperationLabels } from '../services/cleaningService.js';
import { uploadLimits } from '../middleware/uploadMiddleware.js';

const storageSummary = async (userId) => {
  const files = isLocalMode()
    ? getLocalStore().uploadedFiles.filter((file) => String(file.userId) === String(userId))
    : await UploadedFile.find({ userId }).select('fileSizeBytes filePath').lean();
  const usedBytes = files.reduce((total, file) => {
    if (Number(file.fileSizeBytes)) return total + Number(file.fileSizeBytes);
    try { return total + (file.filePath ? fs.statSync(file.filePath).size : 0); } catch { return total; }
  }, 0);
  return {
    usedBytes,
    maxBytes: uploadLimits.maxUserStorageBytes,
    fileCount: files.length,
    maxFiles: uploadLimits.maxUploadFiles,
    maxFileSizeBytes: uploadLimits.maxFileSizeMb * 1024 * 1024,
    maxFileSizeMb: uploadLimits.maxFileSizeMb,
    usedMb: Number((usedBytes / (1024 * 1024)).toFixed(2)),
    maxMb: uploadLimits.maxUserStorageMb,
  };
};

const getBusinessId = async (userId) => {
  if (isLocalMode()) {
    return getLocalStore().businesses.find((business) => String(business.userId) === String(userId))?._id || null;
  }
  return (await Business.findOne({ userId }).select('_id').lean())?._id || null;
};

const removeUploadedTempFile = (filePath) => {
  if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);
};

const getExistingSalesSignatures = async (rows, userId, businessId) => {
  if (!rows.length) return new Set();
  if (isLocalMode()) {
    return new Set(getLocalStore().sales
      .filter((sale) => (
        String(sale.userId) === String(userId)
        && (!businessId || String(sale.businessId) === String(businessId))
      ))
      .map(getRowSignature));
  }

  const dates = rows.map((row) => row.date.getTime());
  const products = [...new Set(rows.map((row) => row.productName))];
  const filter = {
    userId,
    productName: { $in: products },
    date: { $gte: new Date(Math.min(...dates)), $lte: new Date(Math.max(...dates)) },
  };
  if (businessId) filter.businessId = businessId;
  const existing = await Sales.find(filter).select('date productName quantitySold unitPrice totalSales').lean();
  return new Set(existing.map(getRowSignature));
};

const excludePreviouslyImportedRows = async (processing, userId, businessId) => {
  if (!processing.validRows.length) return processing;
  const signatures = await getExistingSalesSignatures(processing.validRows, userId, businessId);

  const uniqueRows = [];
  let previouslyImported = 0;
  processing.validRows.forEach((row) => {
    if (signatures.has(getRowSignature(row))) {
      previouslyImported += 1;
      processing.invalidRows.push({ row: null, errors: ['This sales record was already imported'], values: { productName: row.productName }, duplicate: true, previouslyImported: true });
      return;
    }
    uniqueRows.push(row);
  });
  processing.validRows = uniqueRows;
  processing.duplicateRows += previouslyImported;
  processing.validationErrors = processing.invalidRows.slice(0, 50);
  return processing;
};

const excludeExistingRows = async (rows, userId, businessId) => {
  const signatures = await getExistingSalesSignatures(rows, userId, businessId);
  const importableRows = [];
  let previouslyImported = 0;
  rows.forEach((row) => {
    if (signatures.has(getRowSignature(row))) {
      previouslyImported += 1;
      return;
    }
    importableRows.push(row);
  });
  return { rows: importableRows, previouslyImported };
};

export const uploadFile = async (req, res, next) => {
  let uploadedPath;
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded.' });
    }

    uploadedPath = req.file.path;
    const fileType = getFileType(req.file.originalname);
    if (!fileType) {
      removeUploadedTempFile(uploadedPath);
      return res.status(400).json({ success: false, message: 'Unsupported file type. Upload a CSV, XLS, or XLSX file.' });
    }

    const processing = await excludePreviouslyImportedRows(processSalesFile(uploadedPath, fileType), req.user._id);
    const storage = await storageSummary(req.user._id);
    if (storage.usedBytes + req.file.size > storage.maxBytes) {
      removeUploadedTempFile(uploadedPath);
      return res.status(413).json({ success: false, message: `This upload exceeds your ${storage.maxMb} MB total storage limit. Delete an old upload or choose a smaller file.` });
    }

    const businessId = await getBusinessId(req.user._id);
    const processingSummary = {
      totalRows: processing.totalRows,
      validRows: processing.validRows.length,
      invalidRows: processing.invalidRows.filter((row) => !row.duplicate).length,
      duplicateRows: processing.duplicateRows,
      headers: processing.headers,
      validationErrors: processing.validationErrors,
    };
    let uploadedFile;

    if (isLocalMode()) {
      uploadedFile = {
        _id: createLocalId(),
        userId: req.user._id,
        businessId,
        originalFileName: req.file.originalname,
        fileType,
        filePath: uploadedPath,
        fileSizeBytes: req.file.size,
        status: 'uploaded',
        rowCount: processing.totalRows,
        validRowCount: processing.validRows.length,
        invalidRowCount: processingSummary.invalidRows,
        processingSummary,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      getLocalStore().uploadedFiles.push(uploadedFile);
    } else {
      uploadedFile = await UploadedFile.create({
        userId: req.user._id,
        businessId,
        originalFileName: req.file.originalname,
        fileType,
        filePath: uploadedPath,
        fileSizeBytes: req.file.size,
        status: 'uploaded',
        rowCount: processing.totalRows,
        validRowCount: processing.validRows.length,
        invalidRowCount: processingSummary.invalidRows,
        processingSummary,
      });
    }

    const latestStorage = await storageSummary(req.user._id);
    console.info(`[upload] user=${req.user._id} file=${path.basename(uploadedPath)} rows=${processing.totalRows} valid=${processing.validRows.length} invalid=${processingSummary.invalidRows} duplicates=${processing.duplicateRows}`);

    return res.status(201).json({
      success: true,
      message: 'File validated. Review the preview and confirm the import.',
      data: {
        id: uploadedFile._id,
        fileId: uploadedFile._id,
        fileName: uploadedFile.originalFileName,
        fileType,
        status: uploadedFile.status,
        totalRows: processing.totalRows,
        validRows: processing.validRows.length,
        invalidRows: processingSummary.invalidRows,
        duplicateRows: processing.duplicateRows,
        importedRecords: 0,
        canImport: processing.validRows.length > 0,
        preview: processing.preview,
        validationErrors: processing.validationErrors,
        storage: latestStorage,
      },
    });
  } catch (error) {
    removeUploadedTempFile(uploadedPath || req.file?.path);
    console.error('[upload] Processing failed:', error.message);
    next(error);
  }
};

export const getUploads = async (req, res, next) => {
  try {
    if (isLocalMode()) {
      const files = getLocalStore().uploadedFiles.filter((file) => String(file.userId) === String(req.user._id));
      return res.status(200).json({ success: true, data: files });
    }

    const files = await UploadedFile.find({ userId: req.user._id }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: files });
  } catch (error) {
    next(error);
  }
};

export const getStorageUsage = async (req, res, next) => {
  try {
    res.status(200).json({ success: true, data: await storageSummary(req.user._id) });
  } catch (error) {
    next(error);
  }
};

export const getUploadById = async (req, res, next) => {
  try {
    if (isLocalMode()) {
      const file = getLocalStore().uploadedFiles.find((item) => item._id === req.params.id && String(item.userId) === String(req.user._id));
      if (!file) return res.status(404).json({ success: false, message: 'Upload file not found.' });
      return res.status(200).json({ success: true, data: file });
    }

    const file = await UploadedFile.findOne({ _id: req.params.id, userId: req.user._id });
    if (!file) return res.status(404).json({ success: false, message: 'Upload file not found.' });
    res.status(200).json({ success: true, data: file });
  } catch (error) {
    next(error);
  }
};

export const deleteUpload = async (req, res, next) => {
  try {
    if (isLocalMode()) {
      const store = getLocalStore();
      const fileIndex = store.uploadedFiles.findIndex((item) => item._id === req.params.id && String(item.userId) === String(req.user._id));
      if (fileIndex === -1) return res.status(404).json({ success: false, message: 'File not found.' });
      removeUploadedTempFile(store.uploadedFiles[fileIndex].filePath);
      store.uploadedFiles.splice(fileIndex, 1);
      store.sales = store.sales.filter((item) => item.uploadedFileId !== req.params.id || item.userId !== req.user._id);
      return res.status(200).json({ success: true, message: 'File deleted successfully.' });
    }

    const file = await UploadedFile.findOne({ _id: req.params.id, userId: req.user._id });
    if (!file) return res.status(404).json({ success: false, message: 'File not found.' });

    if (fs.existsSync(file.filePath)) fs.unlinkSync(file.filePath);
    await Sales.deleteMany({ uploadedFileId: file._id, userId: req.user._id });
    await UploadedFile.deleteOne({ _id: file._id });

    res.status(200).json({ success: true, message: 'File deleted successfully.' });
  } catch (error) {
    next(error);
  }
};

export const importSalesData = async (req, res, next) => {
  try {
    let uploadedFile;
    if (isLocalMode()) {
      uploadedFile = getLocalStore().uploadedFiles.find((item) => item._id === req.params.id && String(item.userId) === String(req.user._id));
    } else {
      uploadedFile = await UploadedFile.findOne({ _id: req.params.id, userId: req.user._id });
    }
    if (!uploadedFile) return res.status(404).json({ success: false, message: 'Upload record not found.' });
    if (uploadedFile.status === 'processed') {
      return res.status(409).json({ success: false, message: 'This file has already been imported.' });
    }
    if (!fs.existsSync(uploadedFile.filePath)) {
      return res.status(400).json({ success: false, message: 'The staged upload file is missing from local storage. Please upload it again.' });
    }

    const processing = processSalesFile(uploadedFile.filePath, uploadedFile.fileType);
    const businessId = uploadedFile.businessId || await getBusinessId(req.user._id);
    const requestedCleaning = req.body?.cleaningOptions;
    let cleaningPreview = null;
    let previouslyImported = 0;
    let importableRows;

    if (requestedCleaning) {
      cleaningPreview = createCleaningPreview(processing, requestedCleaning);
      const existingRows = await excludeExistingRows(cleaningPreview.rows, req.user._id, businessId);
      importableRows = existingRows.rows;
      previouslyImported = existingRows.previouslyImported;
      processing.duplicateRows += previouslyImported;
    } else {
      await excludePreviouslyImportedRows(processing, req.user._id, businessId);
      importableRows = processing.validRows;
    }

    if (!importableRows.length) {
      return res.status(400).json({
        success: false,
        message: 'There are no valid rows to import. Review the validation errors and upload corrected data.',
        data: {
          totalRows: processing.totalRows,
          validRows: 0,
          invalidRows: processing.invalidRows.filter((row) => !row.duplicate).length,
          duplicateRows: processing.duplicateRows,
          validationErrors: processing.validationErrors,
          cleaningSummary: cleaningPreview?.summary,
        },
      });
    }

    const salesRows = importableRows.map((row) => ({
      ...row,
      userId: req.user._id,
      businessId,
      uploadedFileId: uploadedFile._id,
      profit: row.purchaseCost === null ? null : row.totalSales - row.purchaseCost * row.quantitySold,
    }));

    if (isLocalMode()) {
      getLocalStore().sales.push(...salesRows.map((row) => ({ ...row, _id: createLocalId() })));
      uploadedFile.status = 'processed';
      uploadedFile.businessId = businessId;
      uploadedFile.rowCount = processing.totalRows;
      uploadedFile.validRowCount = salesRows.length;
      uploadedFile.invalidRowCount = processing.invalidRows.filter((row) => !row.duplicate).length;
      uploadedFile.processingSummary = {
        ...uploadedFile.processingSummary,
        totalRows: processing.totalRows,
        validRows: salesRows.length,
        invalidRows: processing.invalidRows.filter((row) => !row.duplicate).length,
        duplicateRows: processing.duplicateRows,
        importedRecords: salesRows.length,
        validationErrors: processing.validationErrors,
      };
      uploadedFile.updatedAt = new Date().toISOString();
    } else {
      await Sales.insertMany(salesRows, { ordered: true });
      uploadedFile.status = 'processed';
      uploadedFile.businessId = businessId;
      uploadedFile.rowCount = processing.totalRows;
      uploadedFile.validRowCount = salesRows.length;
      uploadedFile.invalidRowCount = processing.invalidRows.filter((row) => !row.duplicate).length;
      uploadedFile.processingSummary = {
        ...uploadedFile.processingSummary,
        totalRows: processing.totalRows,
        validRows: salesRows.length,
        invalidRows: processing.invalidRows.filter((row) => !row.duplicate).length,
        duplicateRows: processing.duplicateRows,
        importedRecords: salesRows.length,
        validationErrors: processing.validationErrors,
      };
      await uploadedFile.save();
    }

    if (cleaningPreview) {
      const history = {
        userId: req.user._id,
        businessId,
        uploadedFileId: uploadedFile._id,
        fileName: uploadedFile.originalFileName,
        operations: getCleaningOperationLabels(cleaningPreview.options),
        rowsBefore: cleaningPreview.rowsBefore,
        rowsAfter: salesRows.length,
        recordsAffected: cleaningPreview.summary.recordsAffected + previouslyImported,
        duplicateCount: cleaningPreview.summary.duplicateRecordCount + previouslyImported,
        invalidRowCount: cleaningPreview.summary.invalidRecordCount,
        status: 'imported',
        summary: {
          ...cleaningPreview.summary,
          rowsAfterImport: salesRows.length,
          previouslyImported,
          importedRecords: salesRows.length,
        },
      };
      if (isLocalMode()) {
        getLocalStore().cleaningHistory.push({ ...history, _id: createLocalId(), createdAt: new Date().toISOString() });
      } else {
        await CleaningHistory.create(history);
      }
    }

    console.info(`[upload] imported user=${req.user._id} upload=${uploadedFile._id} records=${salesRows.length}`);

    return res.status(200).json({
      success: true,
      message: 'Sales data imported successfully.',
      data: {
        fileId: uploadedFile._id,
        totalRows: processing.totalRows,
        validRows: salesRows.length,
        invalidRows: processing.invalidRows.filter((row) => !row.duplicate).length,
        duplicateRows: processing.duplicateRows,
        importedRecords: salesRows.length,
        validationErrors: processing.validationErrors,
        cleaningSummary: cleaningPreview ? {
          ...cleaningPreview.summary,
          rowsAfterImport: salesRows.length,
          previouslyImported,
          importedRecords: salesRows.length,
        } : undefined,
      },
    });
  } catch (error) {
    console.error('[upload] Import failed:', error.message);
    next(error);
  }
};
