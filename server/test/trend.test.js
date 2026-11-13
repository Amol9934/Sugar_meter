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

describe('trend API', () => {
  before(setupDb);
  beforeEach(resetDb);
  after(closeDb);

  test('requires authentication', async () => {
    const res = await request(app).get('/api/reports/trend?days=30');
    assert.equal(res.status, 401);
  });

  test('validates days parameter', async () => {
    const agent = await signedInAgent();

    for (const bad of [undefined, '10', '45', 'abc', '0']) {
      const url = bad === undefined ? '/api/reports/trend' : `/api/reports/trend?days=${bad}`;
      const res = await agent.get(url);
      assert.equal(res.status, 400);
      assert.equal(res.body.error.code, 'VALIDATION_ERROR');
      assert.equal(res.body.error.message, 'Choose 7, 14, 30 or 90 days.');
      assert.equal(res.body.error.field, 'days');
    }
  });

  test('validates date parameter (future dates and malformed strings)', async () => {
    const agent = await signedInAgent();

    const future = await agent.get('/api/reports/trend?days=30&date=2999-01-01');
    assert.equal(future.status, 400);
    assert.equal(future.body.error.message, 'Date cannot be in the future.');
    assert.equal(future.body.error.field, 'date');

    const badDate = await agent.get('/api/reports/trend?days=30&date=not-a-date');
    assert.equal(badDate.status, 400);
    assert.equal(badDate.body.error.field, 'date');
  });

  test('exact values, nulls for gaps, and array length === days', async () => {
    const agent = await signedInAgent();

    // 7 days ending 2026-11-12: from 2026-11-06 to 2026-11-12
    await insert(1, [
      ['2026-11-06', 'morning_fasting', 92],
      ['2026-11-06', 'after_lunch', 135],
      ['2026-11-08', 'after_breakfast', 142],
      ['2026-11-08', 'after_dinner', 155],
      ['2026-11-12', 'morning_fasting', 98],
    ]);

    const { body, status } = await agent.get('/api/reports/trend?days=7&date=2026-11-12');
    assert.equal(status, 200);
    assert.deepEqual(body.range, { from: '2026-11-06', to: '2026-11-12' });
    assert.equal(body.days, 7);
    assert.equal(body.points.length, 7);

    // Verify ascending order
    assert.equal(body.points[0].date, '2026-11-06');
    assert.equal(body.points[6].date, '2026-11-12');

    // Day 0: 2026-11-06
    assert.deepEqual(body.points[0], {
      date: '2026-11-06',
      morning_fasting: 92,
      after_breakfast: null,
      after_lunch: 135,
      after_dinner: null,
    });

    // Day 1: 2026-11-07 (gap day with all nulls)
    assert.deepEqual(body.points[1], {
      date: '2026-11-07',
      morning_fasting: null,
      after_breakfast: null,
      after_lunch: null,
      after_dinner: null,
    });

    // Day 2: 2026-11-08
    assert.deepEqual(body.points[2], {
      date: '2026-11-08',
      morning_fasting: null,
      after_breakfast: 142,
      after_lunch: null,
      after_dinner: 155,
    });

    // Day 6: 2026-11-12
    assert.deepEqual(body.points[6], {
      date: '2026-11-12',
      morning_fasting: 98,
      after_breakfast: null,
      after_lunch: null,
      after_dinner: null,
    });
  });

  test('user isolation: queries only include the signed-in user', async () => {
    const user1Agent = await signedInAgent('user1@example.com', 'User 1');
    const user2Agent = await signedInAgent('user2@example.com', 'User 2');

    await insert(1, [
      ['2026-11-12', 'morning_fasting', 110],
    ]);

    const res2 = await user2Agent.get('/api/reports/trend?days=7&date=2026-11-12');
    assert.equal(res2.status, 200);
    const day = res2.body.points.find((p) => p.date === '2026-11-12');
    assert.equal(day.morning_fasting, null);
  });
});
