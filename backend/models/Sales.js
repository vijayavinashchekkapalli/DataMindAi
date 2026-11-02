import mongoose from 'mongoose';

const salesSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  businessId: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', index: true },
  uploadedFileId: { type: mongoose.Schema.Types.ObjectId, ref: 'UploadedFile', index: true },
  date: { type: Date, required: true, index: true },
  productName: { type: String, required: true, index: true },
  category: { type: String, trim: true, default: 'General' },
  quantitySold: { type: Number, required: true },
  unitPrice: { type: Number, required: true },
  totalSales: { type: Number, required: true },
  purchaseCost: { type: Number, default: null },
  profit: { type: Number, default: null },
}, { timestamps: true });

export default mongoose.model('Sales', salesSchema);
