import mongoose from 'mongoose';

const cleaningHistorySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  businessId: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', index: true },
  uploadedFileId: { type: mongoose.Schema.Types.ObjectId, ref: 'UploadedFile', required: true, index: true },
  fileName: { type: String, trim: true },
  operations: [{ type: String }],
  rowsBefore: { type: Number, required: true },
  rowsAfter: { type: Number, required: true },
  recordsAffected: { type: Number, default: 0 },
  duplicateCount: { type: Number, default: 0 },
  invalidRowCount: { type: Number, default: 0 },
  status: { type: String, enum: ['imported'], default: 'imported' },
  summary: { type: Object, default: {} },
}, { timestamps: true });

export default mongoose.model('CleaningHistory', cleaningHistorySchema);
