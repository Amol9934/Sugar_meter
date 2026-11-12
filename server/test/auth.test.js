import { test, describe, before, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { app, setupDb, resetDb, closeDb } from './helpers.js';
import { pool } from '../src/db/pool.js';

describe('auth', () => {
  before(setupDb);
  beforeEach(resetDb);
  after(closeDb);

  const creds = { name: 'Asha', email: 'Asha@Example.com', password: 'password123' };

  test('register stores a bcrypt hash, never the plain password', async () => {
    const res = await request(app).post('/api/auth/register').send(creds);
    assert.equal(res.status, 201);
    assert.equal(res.body.user.email, 'asha@example.com');
    assert.equal(res.body.user.password_hash, undefined);

    const { rows } = await pool.query('SELECT password_hash FROM users');
    assert.match(rows[0].password_hash, /^\$2[aby]\$/);
    assert.notEqual(rows[0].password_hash, creds.password);
  });

  test('session cookie is httpOnly', async () => {
    const res = await request(app).post('/api/auth/register').send(creds);
    const cookie = res.headers['set-cookie'].join(';');
    assert.match(cookie, /HttpOnly/i);
  });

  test('duplicate email is rejected regardless of case', async () => {
    await request(app).post('/api/auth/register').send(creds);
    const res = await request(app).post('/api/auth/register').send({ ...creds, email: 'asha@example.com' });
    assert.equal(res.status, 409);
    assert.equal(res.body.error.field, 'email');
  });

  test('registration validates input', async () => {
    const bad = [
      [{ ...creds, name: '' }, 'name'],
      [{ ...creds, email: 'nope' }, 'email'],
      [{ ...creds, password: 'short' }, 'password'],
    ];
    for (const [body, field] of bad) {
      const res = await request(app).post('/api/auth/register').send(body);
      assert.equal(res.status, 400);
      assert.equal(res.body.error.field, field);
    }
  });

  test('login works with the right password and fails identically for wrong password / unknown email', async () => {
    await request(app).post('/api/auth/register').send(creds);
    const good = await request(app).post('/api/auth/login').send({ email: 'asha@example.com', password: 'password123' });
    assert.equal(good.status, 200);

    const wrongPw = await request(app).post('/api/auth/login').send({ email: 'asha@example.com', password: 'nope-nope' });
    const noUser = await request(app).post('/api/auth/login').send({ email: 'ghost@example.com', password: 'password123' });
    assert.equal(wrongPw.status, 401);
    assert.equal(noUser.status, 401);
    assert.equal(wrongPw.body.error.message, noUser.body.error.message);
  });

  test('protected routes require a session; logout ends it', async () => {
    assert.equal((await request(app).get('/api/readings')).status, 401);
    assert.equal((await request(app).get('/api/reports')).status, 401);

    const agent = request.agent(app);
    await agent.post('/api/auth/register').send(creds);
    assert.equal((await agent.get('/api/auth/me')).status, 200);
    await agent.post('/api/auth/logout');
    assert.equal((await agent.get('/api/auth/me')).status, 401);
  });
});
