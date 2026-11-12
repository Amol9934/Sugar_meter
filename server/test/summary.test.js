import { test, describe, before, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { setupDb, resetDb, closeDb, signedInAgent, app } from './helpers.js';
import { pool } from '../src/db/pool.js';

async function insert(userId, rows) {
  for (const [date, slot, value] of rows) {
    await pool.query(
      'INSERT INTO readings (user_id, reading_date, slot, value) VALUES ($1,$2,$3,$4)',
      [userId, date, slot, value]
    );
  }
}

describe('summary API', () => {
  before(setupDb);
  beforeEach(resetDb);
  after(closeDb);

  test('requires authentication', async () => {
    const res = await request(app).get('/api/reports/summary?days=30');
    assert.equal(res.status, 401);
  });

  test('validates days parameter', async () => {
    const agent = await signedInAgent();

    for (const bad of [undefined, '10', '45', 'abc', '0']) {
      const url = bad === undefined ? '/api/reports/summary' : `/api/reports/summary?days=${bad}`;
      const res = await agent.get(url);
      assert.equal(res.status, 400);
      assert.equal(res.body.error.code, 'VALIDATION_ERROR');
      assert.equal(res.body.error.message, 'Choose 7, 14, 30 or 90 days.');
      assert.equal(res.body.error.field, 'days');
    }
  });

  test('validates date parameter (future dates and malformed strings)', async () => {
    const agent = await signedInAgent();

    const future = await agent.get('/api/reports/summary?days=30&date=2999-01-01');
    assert.equal(future.status, 400);
    assert.equal(future.body.error.message, 'Date cannot be in the future.');
    assert.equal(future.body.error.field, 'date');

    const badDate = await agent.get('/api/reports/summary?days=30&date=garbage');
    assert.equal(badDate.status, 400);
    assert.equal(badDate.body.error.field, 'date');
  });

  test('empty dataset returns all 4 slots with nulls, zero completeness and correct daily array', async () => {
    const agent = await signedInAgent();
    const { body, status } = await agent.get('/api/reports/summary?days=7&date=2026-11-12');

    assert.equal(status, 200);
    assert.deepEqual(body.range, { from: '2026-11-06', to: '2026-11-12' });
    assert.deepEqual(body.previousRange, { from: '2026-10-30', to: '2026-11-05' });
    assert.equal(body.days, 7);
    assert.equal(body.daysLogged, 0);
    assert.equal(body.completeness, 0);
    assert.deepEqual(body.overall, { count: 0, average: null, lowest: null, highest: null });

    assert.equal(body.slots.length, 4);
    assert.deepEqual(
      body.slots.map((s) => s.slot),
      ['morning_fasting', 'after_breakfast', 'after_lunch', 'after_dinner']
    );
    for (const s of body.slots) {
      assert.deepEqual(s, {
        slot: s.slot,
        count: 0,
        average: null,
        lowest: null,
        highest: null,
        previousAverage: null,
        change: null,
      });
    }

    assert.equal(body.daily.length, 7);
    assert.equal(body.daily[0].date, '2026-11-06');
    assert.equal(body.daily[6].date, '2026-11-12');
    for (const d of body.daily) {
      assert.equal(d.count, 0);
    }
  });

  test('exact numbers, rounding, boundaries, change calculation, and completeness', async () => {
    const agent = await signedInAgent();

    await insert(1, [
      // Outside before previous window: 2026-10-29 (should not be counted)
      ['2026-10-29', 'morning_fasting', 300],

      // Previous window boundaries (2026-10-30 to 2026-11-05)
      ['2026-10-30', 'morning_fasting', 100], // first day of prev window
      ['2026-11-05', 'morning_fasting', 110], // last day of prev window
      ['2026-11-05', 'after_breakfast', 140],

      // Current window boundaries (2026-11-06 to 2026-11-12)
      ['2026-11-06', 'morning_fasting', 95],  // first day of current window
      ['2026-11-06', 'after_lunch', 130],
      ['2026-11-09', 'morning_fasting', 105],
      ['2026-11-09', 'after_dinner', 115],
      ['2026-11-12', 'morning_fasting', 101], // last day of current window
    ]);

    const { body, status } = await agent.get('/api/reports/summary?days=7&date=2026-11-12');
    assert.equal(status, 200);

    assert.deepEqual(body.range, { from: '2026-11-06', to: '2026-11-12' });
    assert.deepEqual(body.previousRange, { from: '2026-10-30', to: '2026-11-05' });
    assert.equal(body.days, 7);
    assert.equal(body.daysLogged, 3); // 2026-11-06, 2026-11-09, 2026-11-12

    // 5 readings out of 7 * 4 = 28 max readings: Math.round(5 / 28 * 100) = 18%
    assert.equal(body.completeness, 18);

    // Overall: 95, 130, 105, 115, 101 -> sum 546 / 5 = 109.2
    assert.deepEqual(body.overall, {
      count: 5,
      lowest: 95,
      highest: 130,
      average: 109.2,
    });

    // Slots verification
    const [mf, ab, al, ad] = body.slots;

    // morning_fasting: current avg (95+105+101)/3 = 100.333 -> 100.3; prev avg (100+110)/2 = 105.0; change = -4.7
    assert.deepEqual(mf, {
      slot: 'morning_fasting',
      count: 3,
      average: 100.3,
      lowest: 95,
      highest: 105,
      previousAverage: 105.0,
      change: -4.7,
    });

    // after_breakfast: no readings in current, but had in previous -> count 0, avg null, change null
    assert.deepEqual(ab, {
      slot: 'after_breakfast',
      count: 0,
      average: null,
      lowest: null,
      highest: null,
      previousAverage: 140.0,
      change: null,
    });

    // after_lunch: 1 reading (130), none in previous -> prevAvg null, change null
    assert.deepEqual(al, {
      slot: 'after_lunch',
      count: 1,
      average: 130.0,
      lowest: 130,
      highest: 130,
      previousAverage: null,
      change: null,
    });

    // after_dinner: 1 reading (115), none in previous -> prevAvg null, change null
    assert.deepEqual(ad, {
      slot: 'after_dinner',
      count: 1,
      average: 115.0,
      lowest: 115,
      highest: 115,
      previousAverage: null,
      change: null,
    });

    // Daily array: 7 days, ascending
    assert.equal(body.daily.length, 7);
    assert.deepEqual(body.daily.map((d) => d.count), [2, 0, 0, 2, 0, 0, 1]);
    assert.equal(body.daily[0].date, '2026-11-06');
    assert.equal(body.daily[6].date, '2026-11-12');
  });

  test('user isolation: queries only include the signed-in user', async () => {
    const user1Agent = await signedInAgent('user1@example.com', 'User 1');
    const user2Agent = await signedInAgent('user2@example.com', 'User 2');

    // Insert readings for user 2 on the same dates
    await insert(2, [
      ['2026-11-10', 'morning_fasting', 250],
      ['2026-11-10', 'after_lunch', 280],
    ]);

    // Insert reading for user 1
    await insert(1, [
      ['2026-11-10', 'morning_fasting', 100],
    ]);

    const res1 = await user1Agent.get('/api/reports/summary?days=7&date=2026-11-12');
    assert.equal(res1.body.overall.count, 1);
    assert.equal(res1.body.overall.average, 100);

    const res2 = await user2Agent.get('/api/reports/summary?days=7&date=2026-11-12');
    assert.equal(res2.body.overall.count, 2);
    assert.equal(res2.body.overall.average, 265);
  });
});

