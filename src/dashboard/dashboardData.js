export const overviewStats = [
  { label: 'Total Revenue', value: '₹0', change: '+0%', tone: 'green' },
  { label: 'Total Products Sold', value: '0', change: '+0%', tone: 'blue' },
  { label: 'Total Transactions', value: '0', change: '+0%', tone: 'gold' },
  { label: 'Best-Selling Product', value: 'No data yet', change: 'Upload sales', tone: 'slate' }
];

export const dailySales = [
  { day: 'Mon', sales: 0 },
  { day: 'Tue', sales: 0 },
  { day: 'Wed', sales: 0 },
  { day: 'Thu', sales: 0 },
  { day: 'Fri', sales: 0 },
  { day: 'Sat', sales: 0 },
  { day: 'Sun', sales: 0 }
];

export const weeklySales = [
  { week: 'W1', sales: 0 },
  { week: 'W2', sales: 0 },
  { week: 'W3', sales: 0 },
  { week: 'W4', sales: 0 },
  { week: 'W5', sales: 0 }
];

export const topProducts = [
  { name: 'Rice', units: 0, revenue: '₹0' },
  { name: 'Oil', units: 0, revenue: '₹0' },
  { name: 'Sugar', units: 0, revenue: '₹0' },
  { name: 'Tea', units: 0, revenue: '₹0' },
  { name: 'Flour', units: 0, revenue: '₹0' }
];

export const recentActivity = [
  { id: 1, product: 'Awaiting uploaded file', status: 'No sales records yet', time: 'Ready' },
  { id: 2, product: 'Upload your CSV or Excel', status: 'Data preview will appear here', time: 'Pending' },
  { id: 3, product: 'AI predictions will unlock after processing', status: 'Waiting for data', time: 'Pending' }
];

export const cleaningSummary = {
  originalRecords: 0,
  validRecords: 0,
  duplicatesRemoved: 0,
  missingValues: 0,
  invalidRows: 0,
  cleanedRecords: 0
};

export const recommendationList = [
  {
    title: 'Upload sales data to generate AI recommendations',
    reason: 'Once sales history is available, DataMind AI will identify demand growth, slow-moving products, and stock risks.',
    tag: 'Waiting for data'
  },
  {
    title: 'Clean and validate uploaded records first',
    reason: 'The system will detect duplicate rows, missing values, and invalid dates before analytics and forecasting are generated.',
    tag: 'Data quality'
  },
  {
    title: 'Predictions will appear after enough data is processed',
    reason: 'Forecasting requires a meaningful historical sales pattern to estimate future demand accurately.',
    tag: 'Forecast readiness'
  }
];

export const forecastList = [
  { product: 'Rice', period: '7 Days', forecast: '0 units', trend: 'Awaiting history', confidence: '0%' },
  { product: 'Oil', period: '15 Days', forecast: '0 units', trend: 'Awaiting history', confidence: '0%' },
  { product: 'Sugar', period: '30 Days', forecast: '0 units', trend: 'Awaiting history', confidence: '0%' }
];

export const reportTemplates = [
  { name: 'Daily Sales Summary', type: 'PDF', updated: 'Not generated yet' },
  { name: 'Weekly Sales Report', type: 'Excel', updated: 'Not generated yet' },
  { name: 'Monthly Performance', type: 'CSV', updated: 'Not generated yet' },
  { name: 'Forecasting Snapshot', type: 'PDF', updated: 'Not generated yet' }
];
