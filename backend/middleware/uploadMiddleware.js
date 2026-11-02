import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import UploadedFile from '../models/UploadedFile.js';
import { getLocalStore, isLocalMode } from '../utils/localStore.js';

const uploadsDir = path.resolve(process.cwd(), 'uploads');
const maxFileSizeMb = Number(process.env.MAX_FILE_SIZE_MB) || 10;
const maxUploadFiles = Number(process.env.MAX_UPLOAD_FILES) || 100;
const maxUserStorageMb = Number(process.env.MAX_USER_STORAGE_MB) || 500;
const maxFileSizeBytes = maxFileSizeMb * 1024 * 1024;
const maxUserStorageBytes = maxUserStorageMb * 1024 * 1024;

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase();
    cb(null, `${randomUUID()}${extension}`);
  },
});

const allowedTypes = {
  '.csv': ['text/csv', 'application/csv', 'text/plain', 'application/vnd.ms-excel', 'application/octet-stream'],
  '.xls': ['application/vnd.ms-excel', 'application/octet-stream'],
  '.xlsx': ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/octet-stream'],
};

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const allowedMimes = allowedTypes[ext];
  if (allowedMimes && allowedMimes.includes(file.mimetype.toLowerCase())) {
    cb(null, true);
    return;
  }

  const error = new Error('Unsupported file type. Upload a CSV, XLS, or XLSX file with a matching file type.');
  error.statusCode = 400;
  cb(error);
};

export const enforceUploadQuota = async (req, res, next) => {
  try {
    const userId = String(req.user._id);
    const files = isLocalMode()
      ? getLocalStore().uploadedFiles.filter((file) => String(file.userId) === userId)
      : await UploadedFile.find({ userId }).select('fileSizeBytes filePath').lean();
    const totalBytes = files.reduce((total, file) => {
      if (Number(file.fileSizeBytes)) return total + Number(file.fileSizeBytes);
      try { return total + (file.filePath ? fs.statSync(file.filePath).size : 0); } catch { return total; }
    }, 0);

    if (files.length >= maxUploadFiles) {
      return res.status(400).json({ success: false, message: `Upload limit reached. You can store up to ${maxUploadFiles} files.` });
    }
    if (totalBytes >= maxUserStorageBytes) {
      return res.status(413).json({ success: false, message: `Your ${maxUserStorageMb} MB storage limit has been reached. Delete an old upload before adding another file.` });
    }
    next();
  } catch (error) {
    next(error);
  }
};

export const upload = multer({
  storage,
  limits: { fileSize: maxFileSizeBytes, files: 1 },
  fileFilter,
});

export const uploadLimits = { maxFileSizeMb, maxUploadFiles, maxUserStorageMb, maxUserStorageBytes };
