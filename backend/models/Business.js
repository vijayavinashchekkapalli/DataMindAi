import mongoose from 'mongoose';

const businessSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  businessName: { type: String, required: true, trim: true },
  businessCategory: { type: String, trim: true },
  location: { type: String, trim: true },
  currency: { type: String, default: 'USD' },
}, { timestamps: true });

export default mongoose.model('Business', businessSchema);
