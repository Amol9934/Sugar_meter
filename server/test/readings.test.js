import { test, describe, before, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import { setupDb, resetDb, closeDb, signedInAgent, reading } from './helpers.js';

describe('readings API', () => {
  before(setupDb);
  beforeEach(resetDb);
  after(closeDb);

  test('creates a reading and returns it', async () => {
    const agent = await signedInAgent();
    const res = await agent.post('/api/readings').send(reading());
    assert.equal(res.status, 201);
    assert.deepEqual(
      { date: res.body.reading.date, slot: res.body.reading.slot, value: res.body.reading.value },
      reading()
    );
  });

  test('every validation rule returns its message and the offending field', async () => {
    const agent = await signedInAgent();
    const cases = [
      [{ value: '' }, 'Please enter a glucose value.', 'value'],
      [{ value: 39 }, 'Value must be between 40 and 600 mg/dl.', 'value'],
      [{ value: 601 }, 'Value must be between 40 and 600 mg/dl.', 'value'],
      [{ value: 99.5 }, 'Value must be between 40 and 600 mg/dl.', 'value'],
      [{ date: '2999-01-01' }, 'Date cannot be in the future.', 'date'],
    ];
    for (const [over, message, field] of cases) {
      const res = await agent.post('/api/readings').send(reading(over));
      assert.equal(res.status, 400, JSON.stringify(over));
      assert.equal(res.body.error.message, message);
      assert.equal(res.body.error.field, field);
    }
  });

  test('only one reading per slot per day', async () => {
    const agent = await signedInAgent();
    await agent.post('/api/readings').send(reading({ slot: 'after_lunch' }));
    const dup = await agent.post('/api/readings').send(reading({ slot: 'after_lunch', value: 150 }));
    assert.equal(dup.status, 409);
    assert.equal(dup.body.error.message, 'You already have an After lunch reading for this date.');
  });

  test('the same slot on a different day is fine', async () => {
    const agent = await signedInAgent();
    await agent.post('/api/readings').send(reading());
    const res = await agent.post('/api/readings').send(reading({ date: '2026-10-14' }));
    assert.equal(res.status, 201);
  });

  test('a day can hold all four slots, and a fifth attempt is refused', async () => {
    const agent = await signedInAgent();
    for (const slot of ['morning_fasting', 'after_breakfast', 'after_lunch', 'after_dinner']) {
      assert.equal((await agent.post('/api/readings').send(reading({ slot }))).status, 201);
    }
    const extra = await agent.post('/api/readings').send(reading({ slot: 'after_lunch' }));
    assert.equal(extra.status, 409);
  });

  test('two simultaneous identical requests: exactly one wins (no race)', async () => {
    const agent = await signedInAgent();
    const results = await Promise.all(
      Array.from({ length: 5 }, () => agent.post('/api/readings').send(reading()))
    );
    const statuses = results.map((r) => r.status).sort();
    assert.deepEqual(statuses, [201, 409, 409, 409, 409]);
    const list = await agent.get('/api/readings');
    assert.equal(list.body.total, 1);
  });

  test('edit updates the value; editing into an occupied slot is refused', async () => {
    const agent = await signedInAgent();
    const a = (await agent.post('/api/readings').send(reading())).body.reading;
    await agent.post('/api/readings').send(reading({ slot: 'after_lunch' }));

    const edited = await agent.put(`/api/readings/${a.id}`).send(reading({ value: 130 }));
    assert.equal(edited.status, 200);
    assert.equal(edited.body.reading.value, 130);

    const clash = await agent.put(`/api/readings/${a.id}`).send(reading({ slot: 'after_lunch' }));
    assert.equal(clash.status, 409);
    assert.match(clash.body.error.message, /After lunch/);
  });

  test('editing a reading without changing its slot is not a self-conflict', async () => {
    const agent = await signedInAgent();
    const a = (await agent.post('/api/readings').send(reading())).body.reading;
    const res = await agent.put(`/api/readings/${a.id}`).send(reading());
    assert.equal(res.status, 200);
  });

  test('delete removes the reading and frees the slot', async () => {
    const agent = await signedInAgent();
    const a = (await agent.post('/api/readings').send(reading())).body.reading;
    assert.equal((await agent.delete(`/api/readings/${a.id}`)).status, 204);
    assert.equal((await agent.post('/api/readings').send(reading())).status, 201);
  });

  test("users cannot see, edit or delete each other's readings", async () => {
    const asha = await signedInAgent('asha@example.com');
    const ravi = await signedInAgent('ravi@example.com', 'Ravi');
    const mine = (await asha.post('/api/readings').send(reading())).body.reading;

    assert.equal((await ravi.get('/api/readings')).body.total, 0);
    assert.equal((await ravi.put(`/api/readings/${mine.id}`).send(reading({ value: 500 }))).status, 404);
    assert.equal((await ravi.delete(`/api/readings/${mine.id}`)).status, 404);
    // Ravi can also use the same slot/day independently
    assert.equal((await ravi.post('/api/readings').send(reading())).status, 201);
    assert.equal((await asha.get('/api/readings')).body.data[0].value, 110);
  });

  test('list is paginated and filterable by date', async () => {
    const agent = await signedInAgent();
    for (let d = 1; d <= 5; d++) {
      await agent.post('/api/readings').send(reading({ date: `2026-10-0${d}` }));
    }
    const p1 = await agent.get('/api/readings?page=1&limit=2');
    assert.equal(p1.body.data.length, 2);
    assert.equal(p1.body.total, 5);
    assert.equal(p1.body.totalPages, 3);
    assert.equal(p1.body.data[0].date, '2026-10-05'); // newest first
    const p3 = await agent.get('/api/readings?page=3&limit=2');
    assert.equal(p3.body.data.length, 1);
    const one = await agent.get('/api/readings?date=2026-10-03');
    assert.equal(one.body.total, 1);
  });

  test('malformed ids are a clean 404, bad JSON a clean 400', async () => {
    const agent = await signedInAgent();
    assert.equal((await agent.delete('/api/readings/abc')).status, 404);
    const bad = await agent.post('/api/readings').set('Content-Type', 'application/json').send('{oops');
    assert.equal(bad.status, 400);
  });
});
