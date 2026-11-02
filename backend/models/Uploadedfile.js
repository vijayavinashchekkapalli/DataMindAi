import mongoose from 'mongoose';

const uploadedFileSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  businessId: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', index: true },
  originalFileName: { type: String, required: true },
  fileType: { type: String, enum: ['csv', 'xlsx', 'xls'], required: true },
  filePath: { type: String, required: true },
  fileSizeBytes: { type: Number, default: 0 },
  status: { type: String, enum: ['uploaded', 'processed', 'failed'], default: 'uploaded' },
  rowCount: { type: Number, default: 0 },
  validRowCount: { type: Number, default: 0 },
  invalidRowCount: { type: Number, default: 0 },
  processingSummary: { type: Object, default: {} },
}, { timestamps: true });

export default mongoose.model('UploadedFile', uploadedFileSchema);
