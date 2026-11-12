import bcrypt from 'bcryptjs';
import { pool } from './pool.js';
import { migrate } from './migrate.js';
import { config } from '../config.js';
import { todayIn } from '../lib/dates.js';
import { SLOT_KEYS } from '../lib/slots.js';

export const DEMO = { name: 'Demo Patient', email: 'demo@sweety.app', password: 'Demo@1234' };

// Small deterministic PRNG so the demo data looks the same on every machine.
function mulberry32(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const addDays = (iso, n) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
};

// Typical-looking values per slot: fasting is lowest, after-meal readings run higher.
const BASE = { morning_fasting: 105, after_breakfast: 150, after_lunch: 145, after_dinner: 140 };

async function seed() {
  await migrate();
  const rand = mulberry32(42);
  const hash = await bcrypt.hash(DEMO.password, config.bcryptRounds);

  const { rows } = await pool.query(
    `INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3)
     ON CONFLICT ((lower(email))) DO UPDATE SET password_hash = EXCLUDED.password_hash
     RETURNING id`,
    [DEMO.name, DEMO.email, hash]
  );
  const userId = rows[0].id;
  await pool.query('DELETE FROM readings WHERE user_id = $1', [userId]);

  const today = todayIn(config.timezone);
  const values = [];
  // ~65 days back so there is data in both the current and the previous month.
  for (let back = 0; back < 65; back++) {
    const date = addDays(today, -back);
    for (const slot of SLOT_KEYS) {
      if (rand() < 0.18) continue; // patients forget sometimes: not every slot is filled
      const v = Math.round(BASE[slot] + (rand() - 0.5) * 60);
      values.push([userId, date, slot, Math.min(600, Math.max(40, v))]);
    }
  }
  for (const row of values) {
    await pool.query(
      'INSERT INTO readings (user_id, reading_date, slot, value) VALUES ($1,$2,$3,$4)',
      row
    );
  }
  console.log(`Seeded ${values.length} readings for ${DEMO.email} (password: ${DEMO.password})`);
}

seed()
  .then(() => pool.end())
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
