import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  firstName: { type: String, required: true, trim: true },
  lastName: { type: String, required: true, trim: true },
  email: { type: String, trim: true, lowercase: true, unique: true, sparse: true },
  phoneNumber: { type: String, trim: true, sparse: true },
  passwordHash: { type: String, select: false },
  googleId: { type: String, unique: true, sparse: true },
  authProvider: { type: String, enum: ['local', 'google'], default: 'local' },
  businessName: { type: String, trim: true },
  businessCategory: { type: String, trim: true },
  location: { type: String, trim: true },
  currency: { type: String, default: 'USD' },
}, { timestamps: true });

export default mongoose.model('User', userSchema);
