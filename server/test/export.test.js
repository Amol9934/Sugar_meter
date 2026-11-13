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

describe('readings CSV export API', () => {
  before(setupDb);
  beforeEach(resetDb);
  after(closeDb);

  test('requires authentication', async () => {
    const res = await request(app).get('/api/readings/export.csv');
    assert.equal(res.status, 401);
  });

  test('validates date parameters and invalid range', async () => {
    const agent = await signedInAgent();

    // Invalid from date format
    const badFrom = await agent.get('/api/readings/export.csv?from=bad-date');
    assert.equal(badFrom.status, 400);
    assert.equal(badFrom.body.error.field, 'from');

    // Invalid to date format
    const badTo = await agent.get('/api/readings/export.csv?to=bad-date');
    assert.equal(badTo.status, 400);
    assert.equal(badTo.body.error.field, 'to');

    // from > to
    const reversed = await agent.get('/api/readings/export.csv?from=2026-11-10&to=2026-11-05');
    assert.equal(reversed.status, 400);
    assert.equal(reversed.body.error.message, "The 'from' date must be on or before the 'to' date.");
    assert.equal(reversed.body.error.field, 'from');
  });

  test('exports content, headers, human-readable slot labels, and correct order', async () => {
    const agent = await signedInAgent();

    // Insert out of slot order and out of date order to test SQL sorting
    await insert(1, [
      ['2026-11-12', 'after_dinner', 160],
      ['2026-11-12', 'morning_fasting', 95],
      ['2026-11-12', 'after_lunch', 130],
      ['2026-11-11', 'after_breakfast', 140],
      ['2026-11-11', 'morning_fasting', 90],
    ]);

    const res = await agent.get('/api/readings/export.csv?from=2026-11-11&to=2026-11-12');
    assert.equal(res.status, 200);
    assert.equal(res.headers['content-type'], 'text/csv; charset=utf-8');
    assert.equal(
      res.headers['content-disposition'],
      'attachment; filename="sweety-readings-2026-11-11-2026-11-12.csv"'
    );

    const expected = [
      'date,slot,value',
      '2026-11-11,Morning (fasting),90',
      '2026-11-11,After breakfast,140',
      '2026-11-12,Morning (fasting),95',
      '2026-11-12,After lunch,130',
      '2026-11-12,After dinner,160',
      '',
    ].join('\r\n');

    assert.equal(res.text, expected);
  });

  test('filters by from and to dates', async () => {
    const agent = await signedInAgent();

    await insert(1, [
      ['2026-11-01', 'morning_fasting', 88],
      ['2026-11-05', 'morning_fasting', 92],
      ['2026-11-10', 'morning_fasting', 96],
    ]);

    // Only 2026-11-05 to 2026-11-08
    const res = await agent.get('/api/readings/export.csv?from=2026-11-04&to=2026-11-08');
    assert.equal(res.status, 200);

    const expected = [
      'date,slot,value',
      '2026-11-05,Morning (fasting),92',
      '',
    ].join('\r\n');

    assert.equal(res.text, expected);
  });

  test('user isolation: only exports the signed-in user readings', async () => {
    const user1Agent = await signedInAgent('csvuser1@example.com', 'User 1');
    const user2Agent = await signedInAgent('csvuser2@example.com', 'User 2');

    await insert(1, [['2026-11-12', 'morning_fasting', 100]]);
    await insert(2, [['2026-11-12', 'morning_fasting', 250]]);

    const res1 = await user1Agent.get('/api/readings/export.csv');
    assert.ok(res1.text.includes('2026-11-12,Morning (fasting),100'));
    assert.ok(!res1.text.includes('250'));

    const res2 = await user2Agent.get('/api/readings/export.csv');
    assert.ok(res2.text.includes('2026-11-12,Morning (fasting),250'));
    assert.ok(!res2.text.includes('100'));
  });
});
