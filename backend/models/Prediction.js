import mongoose from 'mongoose';

const predictionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  businessId: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', index: true },
  productName: { type: String, required: true },
  forecastPeriod: { type: String, required: true },
  predictedQuantity: { type: Number, required: true },
  confidence: { type: Number, default: 0 },
  notes: { type: String, default: '' },
}, { timestamps: true });

export default mongoose.model('Prediction', predictionSchema);
