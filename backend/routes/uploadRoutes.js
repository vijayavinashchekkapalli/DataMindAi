import { Router } from 'express';
import { upload, enforceUploadQuota } from '../middleware/uploadMiddleware.js';
import { uploadFile, getUploads, getStorageUsage, getUploadById, deleteUpload, importSalesData } from '../controllers/uploadController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = Router();

router.use(authMiddleware);
router.post('/', enforceUploadQuota, upload.single('file'), uploadFile);
router.get('/', getUploads);
router.get('/storage', getStorageUsage);
router.get('/:id', getUploadById);
router.post('/:id/import', importSalesData);
router.delete('/:id', deleteUpload);

export default router;
