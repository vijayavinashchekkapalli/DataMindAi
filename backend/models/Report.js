import mongoose from 'mongoose';

const reportSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  businessId: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', index: true },
  reportType: { type: String, required: true },
  format: { type: String, enum: ['pdf', 'excel', 'csv'], default: 'pdf' },
  fileName: { type: String, required: true },
  filePath: { type: String },
  generatedAt: { type: Date, default: Date.now },
}, { timestamps: true });

export default mongoose.model('Report', reportSchema);
