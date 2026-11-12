import { test, describe, before, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import { setupDb, resetDb, closeDb, signedInAgent } from './helpers.js';
import { pool } from '../src/db/pool.js';

// Insert directly so the fixture can include dates the API would also allow, without 30 requests.
async function insert(userId, rows) {
  for (const [date, slot, value] of rows) {
    await pool.query(
      'INSERT INTO readings (user_id, reading_date, slot, value) VALUES ($1,$2,$3,$4)',
      [userId, date, slot, value]
    );
  }
}

describe('reports API', () => {
  before(setupDb);
  beforeEach(resetDb);
  after(closeDb);

  test('daily, month-to-date and previous-month stats for the assignment example date', async () => {
    const agent = await signedInAgent();
    await insert(1, [
      // selected day: 15 Oct
      ['2026-10-15', 'morning_fasting', 100],
      ['2026-10-15', 'after_breakfast', 141],
      ['2026-10-15', 'after_dinner', 120],
      // earlier in October (in month-to-date, not in the day)
      ['2026-10-01', 'morning_fasting', 90],
      ['2026-10-10', 'after_lunch', 200],
      // after the selected date: must be excluded from month-to-date
      ['2026-10-20', 'after_lunch', 599],
      // September boundaries are both included in the previous month
      ['2026-09-01', 'morning_fasting', 80],
      ['2026-09-30', 'after_dinner', 111],
      // August: outside every range
      ['2026-08-31', 'after_dinner', 400],
    ]);

    const { body } = (await agent.get('/api/reports?date=2026-10-15'));

    assert.deepEqual(body.daily.range, { from: '2026-10-15', to: '2026-10-15' });
    // (100 + 141 + 120) / 3 = 120.333.. -> 120.3
    assert.deepEqual(body.daily.stats, { count: 3, highest: 141, lowest: 100, average: 120.3 });
    assert.deepEqual(body.daily.readings.map((r) => r.slot), ['morning_fasting', 'after_breakfast', 'after_dinner']);

    assert.deepEqual(body.monthToDate.range, { from: '2026-10-01', to: '2026-10-15' });
    // 100,141,120,90,200 -> 651 / 5 = 130.2
    assert.deepEqual(body.monthToDate.stats, { count: 5, highest: 200, lowest: 90, average: 130.2 });

    assert.deepEqual(body.previousMonth.range, { from: '2026-09-01', to: '2026-09-30' });
    // (80 + 111) / 2 = 95.5
    assert.deepEqual(body.previousMonth.stats, { count: 2, highest: 111, lowest: 80, average: 95.5 });
  });

  test('empty ranges return count 0 and nulls (the UI shows the empty state)', async () => {
    const agent = await signedInAgent();
    const { body } = await agent.get('/api/reports?date=2026-10-15');
    const empty = { count: 0, highest: null, lowest: null, average: null };
    assert.deepEqual(body.daily.stats, empty);
    assert.deepEqual(body.monthToDate.stats, empty);
    assert.deepEqual(body.previousMonth.stats, empty);
    assert.deepEqual(body.daily.readings, []);
  });

  test('reports only include the signed-in user', async () => {
    const asha = await signedInAgent('asha@example.com');
    await signedInAgent('ravi@example.com', 'Ravi');
    await insert(1, [['2026-10-15', 'morning_fasting', 100]]);
    await insert(2, [['2026-10-15', 'morning_fasting', 300]]);
    const { body } = await asha.get('/api/reports?date=2026-10-15');
    assert.equal(body.daily.stats.highest, 100);
    assert.equal(body.daily.stats.count, 1);
  });

  test('January looks back to December of the previous year', async () => {
    const agent = await signedInAgent();
    await insert(1, [['2025-12-31', 'after_dinner', 150], ['2026-01-05', 'after_dinner', 130]]);
    const { body } = await agent.get('/api/reports?date=2026-01-10');
    assert.deepEqual(body.previousMonth.range, { from: '2025-12-01', to: '2025-12-31' });
    assert.equal(body.previousMonth.stats.count, 1);
    assert.equal(body.monthToDate.stats.count, 1);
  });

  test('rejects future and malformed dates', async () => {
    const agent = await signedInAgent();
    const future = await agent.get('/api/reports?date=2999-01-01');
    assert.equal(future.status, 400);
    assert.equal(future.body.error.message, 'Date cannot be in the future.');
    assert.equal((await agent.get('/api/reports?date=garbage')).status, 400);
  });

  test('defaults to today when no date is given', async () => {
    const agent = await signedInAgent();
    const { body, status } = await agent.get('/api/reports');
    assert.equal(status, 200);
    assert.match(body.date, /^\d{4}-\d{2}-\d{2}$/);
  });
});
