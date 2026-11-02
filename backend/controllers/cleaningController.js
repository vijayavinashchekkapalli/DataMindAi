import mongoose from 'mongoose';
import CleaningHistory from '../models/CleaningHistory.js';
import UploadedFile from '../models/UploadedFile.js';
import Business from '../models/Business.js';
import { getLocalStore, isLocalMode } from '../utils/localStore.js';
import { processSalesFile } from '../services/salesFileProcessor.js';
import { createCleaningPreview } from '../services/cleaningService.js';

const getOwnedFile = async (fileId, userId) => {
  if (isLocalMode()) {
    return getLocalStore().uploadedFiles.find((file) => (
      String(file._id) === String(fileId) && String(file.userId) === String(userId)
    )) || null;
  }
  if (!mongoose.Types.ObjectId.isValid(fileId)) return null;
  return UploadedFile.findOne({ _id: fileId, userId });
};

const getBusinessId = async (userId) => {
  if (isLocalMode()) {
    return getLocalStore().businesses.find((business) => (
      String(business.userId) === String(userId)
    ))?._id || null;
  }
  return (await Business.findOne({ userId }).select('_id').lean())?._id || null;
};

export const cleanFile = async (req, res, next) => {
  try {
    const uploadedFile = await getOwnedFile(req.params.fileId, req.user._id);
    if (!uploadedFile) {
      return res.status(404).json({ success: false, message: 'Uploaded file not found.' });
    }

    if (!uploadedFile.filePath) {
      return res.status(400).json({ success: false, message: 'The original uploaded file is unavailable. Upload the source file again to preview its cleaning results.' });
    }

    const processing = processSalesFile(uploadedFile.filePath, uploadedFile.fileType);
    const preview = createCleaningPreview(processing, req.body?.operations);

    return res.status(200).json({
      success: true,
      message: 'Cleaning preview ready. Review the original and cleaned data before confirming import.',
      data: {
        fileId: uploadedFile._id,
        fileName: uploadedFile.originalFileName,
        fileStatus: uploadedFile.status,
        headers: processing.headers,
        ...preview,
      },
    });
  } catch (error) {
    return next(error);
  }
};

export const getCleaningHistory = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const businessId = await getBusinessId(userId);

    if (req.params.fileId) {
      const uploadedFile = await getOwnedFile(req.params.fileId, userId);
      if (!uploadedFile) {
        return res.status(404).json({ success: false, message: 'Uploaded file not found.' });
      }

      const filter = { userId, uploadedFileId: uploadedFile._id };
      const fileBusinessId = uploadedFile.businessId || businessId;
      if (fileBusinessId) filter.$or = [{ businessId: fileBusinessId }, { businessId: null }];

      const history = isLocalMode()
        ? getLocalStore().cleaningHistory.filter((item) => (
          String(item.userId) === String(userId)
          && String(item.uploadedFileId) === String(uploadedFile._id)
          && (!fileBusinessId || !item.businessId || String(item.businessId) === String(fileBusinessId))
        )).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        : await CleaningHistory.find(filter).sort({ createdAt: -1 }).lean();

      return res.status(200).json({
        success: true,
        data: history.map((item) => ({
          ...item,
          fileName: item.fileName || uploadedFile.originalFileName,
        })),
      });
    }

    let history;
    if (isLocalMode()) {
      const store = getLocalStore();
      const ownedFileIds = new Set(store.uploadedFiles
        .filter((file) => String(file.userId) === String(userId))
        .map((file) => String(file._id)));
      const filesById = new Map(store.uploadedFiles.map((file) => [String(file._id), file]));
      history = store.cleaningHistory
        .filter((item) => (
          String(item.userId) === String(userId)
          && ownedFileIds.has(String(item.uploadedFileId))
          && (!businessId || !item.businessId || String(item.businessId) === String(businessId))
        ))
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .map((item) => ({
          ...item,
          fileName: item.fileName || filesById.get(String(item.uploadedFileId))?.originalFileName || 'Uploaded sales file',
        }));
    } else {
      const ownedFiles = await UploadedFile.find({ userId })
        .select('_id originalFileName')
        .lean();
      const filesById = new Map(ownedFiles.map((file) => [String(file._id), file]));
      const fileIds = ownedFiles.map((file) => file._id);
      const filter = { userId, uploadedFileId: { $in: fileIds } };
      if (businessId) filter.$or = [{ businessId }, { businessId: null }];
      history = await CleaningHistory.find(filter).sort({ createdAt: -1 }).lean();
      history = history.map((item) => ({
        ...item,
        fileName: item.fileName || filesById.get(String(item.uploadedFileId))?.originalFileName || 'Uploaded sales file',
      }));
    }

    return res.status(200).json({ success: true, data: history });
  } catch (error) {
    return next(error);
  }
};
