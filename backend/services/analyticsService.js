const DAY_MS = 24 * 60 * 60 * 1000;

const invalidRange = (message) => {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
};

const parseDateOnly = (value) => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return date;
};

const subtractUtcMonths = (date, months) => {
  const result = new Date(date);
  const day = result.getUTCDate();
  result.setUTCDate(1);
  result.setUTCMonth(result.getUTCMonth() - months);
  const lastDay = new Date(Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)).getUTCDate();
  result.setUTCDate(Math.min(day, lastDay));
  return result;
};

export const resolveDateRange = (query = {}, now = new Date()) => {
  const range = String(query.range || '30d').toLowerCase();
  const end = new Date(now);
  let start;

  if (range === 'custom') {
    const startDate = parseDateOnly(query.startDate);
    const endDate = parseDateOnly(query.endDate);
    if (!startDate || !endDate) {
      throw invalidRange('Custom date ranges require valid startDate and endDate values in YYYY-MM-DD format.');
    }
    if (startDate > endDate) {
      throw invalidRange('The custom range start date must be on or before its end date.');
    }
    return {
      start: startDate,
      end: new Date(endDate.getTime() + DAY_MS),
    };
  }

  if (range === 'all') return { start: new Date(0), end };

  if (range === 'thisweek' || range === 'this-week') {
    start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    start.setUTCDate(start.getUTCDate() - ((start.getUTCDay() + 6) % 7));
    return { start, end };
  }

  const durationByRange = {
    '7d': 7,
    last7days: 7,
    '30d': 30,
    last30days: 30,
    '90d': 90,
    last90days: 90,
  };
  const duration = durationByRange[range];
  if (duration) {
    return { start: new Date(now.getTime() - duration * DAY_MS), end };
  }

  if (range === '6m' || range === '6months' || range === 'last6months') {
    return { start: subtractUtcMonths(now, 6), end };
  }

  throw invalidRange('Unsupported date range. Choose thisWeek, 7d, 30d, 90d, 6m, or custom.');
};

const getMondayUtc = (date) => {
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  start.setUTCDate(start.getUTCDate() - ((start.getUTCDay() + 6) % 7));
  return start;
};

const toDateKey = (date) => date.toISOString().slice(0, 10);

const formatWeekLabel = (weekStart, weekEnd) => {
  const formatter = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
  return `${formatter.format(weekStart)} - ${formatter.format(weekEnd)}`;
};

export const formatWeeklyRevenue = (groups) => groups
  .map(({ weekStart, revenue, quantitySold, transactions }) => {
    const start = new Date(weekStart);
    const end = new Date(start.getTime() + 6 * DAY_MS);
    return {
      weekStart: toDateKey(start),
      weekEnd: toDateKey(end),
      weekLabel: formatWeekLabel(start, end),
      revenue: Number(revenue) || 0,
      quantitySold: Number(quantitySold) || 0,
      transactions: Number(transactions) || 0,
    };
  })
  .sort((left, right) => left.weekStart.localeCompare(right.weekStart));

export const groupWeeklyRevenue = (sales) => {
  const weeks = new Map();
  sales.forEach((sale) => {
    const date = new Date(sale.date);
    if (Number.isNaN(date.getTime())) return;
    const weekStart = getMondayUtc(date);
    const key = toDateKey(weekStart);
    const group = weeks.get(key) || { weekStart, revenue: 0, quantitySold: 0, transactions: 0 };
    group.revenue += Number(sale.totalSales) || 0;
    group.quantitySold += Number(sale.quantitySold) || 0;
    group.transactions += 1;
    weeks.set(key, group);
  });
  return formatWeeklyRevenue([...weeks.values()]);
};
