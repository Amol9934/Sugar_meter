import request from 'supertest';
import { createApp } from '../src/app.js';
import { migrate } from '../src/db/migrate.js';
import { pool } from '../src/db/pool.js';

export const app = createApp();

export async function setupDb() {
  await migrate();
}

export async function resetDb() {
  await pool.query('TRUNCATE users RESTART IDENTITY CASCADE');
}

export async function closeDb() {
  await pool.end();
}

/** Registers a user and returns a supertest agent that keeps the session cookie. */
export async function signedInAgent(email = 'asha@example.com', name = 'Asha') {
  const agent = request.agent(app);
  const res = await agent.post('/api/auth/register').send({ name, email, password: 'password123' });
  if (res.status !== 201) throw new Error(`register failed: ${res.status} ${JSON.stringify(res.body)}`);
  return agent;
}

export const reading = (over = {}) => ({
  date: '2026-10-15',
  slot: 'morning_fasting',
  value: 110,
  ...over,
});
