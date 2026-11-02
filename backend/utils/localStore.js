const localState = {
  users: [],
  businesses: [],
  uploadedFiles: [],
  sales: [],
  predictions: [],
  reports: [],
  cleaningHistory: [],
};

export const getLocalStore = () => localState;

export const isLocalMode = () => {
  const mongoUri = (process.env.MONGO_URI || process.env.MONGODB_URI || '').trim();
  return !mongoUri || !mongoUri.startsWith('mongodb');
};

export const createLocalId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;
