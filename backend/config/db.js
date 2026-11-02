import mongoose from 'mongoose';

export const connectDB = async () => {
  const mongoURI = (process.env.MONGO_URI || process.env.MONGODB_URI || '').trim();

  if (!mongoURI || !mongoURI.startsWith('mongodb')) {
    console.warn('MongoDB URI is not defined or is invalid. Starting backend without MongoDB connection. Add your Atlas connection string to enable database features.');
    return;
  }

  try {
    await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 10000,
      maxPoolSize: 10,
    });

    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error.message);
    throw error;
  }
};
