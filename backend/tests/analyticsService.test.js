import test from 'node:test';
import assert from 'node:assert/strict';
import { groupWeeklyRevenue, resolveDateRange } from '../services/analyticsService.js';

test('groups revenue and transactions into Monday-to-Sunday UTC weeks', () => {
  const weekly = groupWeeklyRevenue([
    { date: '2026-10-05T00:15:00.000Z', totalSales: 100, quantitySold: 2 },
    { date: '2026-10-11T23:59:00.000Z', totalSales: 250, quantitySold: 3 },
    { date: '2026-10-12T00:00:00.000Z', totalSales: 50, quantitySold: 1 },
  ]);

  assert.deepEqual(weekly, [
    {
      weekStart: '2026-10-05',
      weekEnd: '2026-10-11',
      weekLabel: 'Oct 5 - Oct 11',
      revenue: 350,
      quantitySold: 5,
      transactions: 2,
    },
    {
      weekStart: '2026-10-12',
      weekEnd: '2026-10-18',
      weekLabel: 'Oct 12 - Oct 18',
      revenue: 50,
      quantitySold: 1,
      transactions: 1,
    },
  ]);
});

test('resolves weekly and custom ranges in UTC with an exclusive end boundary', () => {
  const now = new Date('2026-10-14T12:00:00.000Z');
  const thisWeek = resolveDateRange({ range: 'thisWeek' }, now);
  assert.equal(thisWeek.start.toISOString(), '2026-10-12T00:00:00.000Z');
  assert.equal(thisWeek.end.toISOString(), now.toISOString());

  const custom = resolveDateRange({
    range: 'custom',
    startDate: '2026-10-05',
    endDate: '2026-10-11',
  }, now);
  assert.equal(custom.start.toISOString(), '2026-10-05T00:00:00.000Z');
  assert.equal(custom.end.toISOString(), '2026-10-12T00:00:00.000Z');
});

test('rejects invalid custom dates and inverted date ranges', () => {
  assert.throws(() => resolveDateRange({ range: 'custom', startDate: '2026-02-30', endDate: '2026-03-01' }), /valid startDate and endDate/);
  assert.throws(() => resolveDateRange({ range: 'custom', startDate: '2026-10-12', endDate: '2026-10-11' }), /on or before/);
});
