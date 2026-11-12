import { Router } from 'express';
import { query, pool } from '../db/pool.js';
import { config } from '../config.js';
import { requireAuth } from '../middleware/auth.js';
import { todayIn, isValidIsoDate } from '../lib/dates.js';
import { validateReadingInput, assertCanStore, MESSAGES } from '../lib/readingRules.js';
import { conflictError, notFound, validationError } from '../lib/errors.js';


export const readingsRouter = Router();
readingsRouter.use(requireAuth);

export const toDto = (r) => ({
  id: r.id,
  date: r.reading_date,
  slot: r.slot,
  value: r.value,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

const COLUMNS = 'id, reading_date, slot, value, created_at, updated_at';

function parseId(raw) {
  if (!/^\d+$/.test(raw)) throw notFound('Reading not found.');
  return Number(raw);
}

/**
 * Checks the day's existing readings (excluding the one being edited) against the rules.
 * Runs inside a transaction together with the write, serialised per user+date by an advisory
 * lock, so two simultaneous requests cannot both pass the count check.
 * The UNIQUE constraint remains the last line of defence.
 */
async function writeReading({ userId, input, excludeId = null, write }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock($1, hashtext($2))', [userId, input.date]);
    const { rows } = await client.query(
      'SELECT slot FROM readings WHERE user_id = $1 AND reading_date = $2 AND id IS DISTINCT FROM $3',
      [userId, input.date, excludeId]
    );
    assertCanStore(rows.map((r) => r.slot), input.slot);
    const result = await write(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    // Backstop: the constraint fired even though the pre-check passed.
    if (err.code === '23505') throw conflictError(MESSAGES.duplicateSlot(input.slot), 'slot');
    throw err;
  } finally {
    client.release();
  }
}

// GET /api/readings?page=1&limit=20&date=YYYY-MM-DD   (page/limit/date all optional)
readingsRouter.get('/', async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
  const { date } = req.query;
  if (date !== undefined && !isValidIsoDate(date)) throw validationError(MESSAGES.dateInvalid, 'date');

  const where = date ? 'user_id = $1 AND reading_date = $2' : 'user_id = $1';
  const filterParams = date ? [req.userId, date] : [req.userId];

  const [{ rows }, { rows: count }] = await Promise.all([
    query(
      `SELECT ${COLUMNS} FROM readings WHERE ${where}
       ORDER BY reading_date DESC, created_at DESC, id DESC
       LIMIT $${filterParams.length + 1} OFFSET $${filterParams.length + 2}`,
      [...filterParams, limit, (page - 1) * limit]
    ),
    query(`SELECT COUNT(*)::int AS total FROM readings WHERE ${where}`, filterParams),
  ]);

  const total = count[0].total;
  res.json({ data: rows.map(toDto), page, limit, total, totalPages: Math.ceil(total / limit) });
});

readingsRouter.post('/', async (req, res) => {
  const input = validateReadingInput(req.body, todayIn(config.timezone));
  const reading = await writeReading({
    userId: req.userId,
    input,
    write: async (client) =>
      (
        await client.query(
          `INSERT INTO readings (user_id, reading_date, slot, value) VALUES ($1,$2,$3,$4)
           RETURNING ${COLUMNS}`,
          [req.userId, input.date, input.slot, input.value]
        )
      ).rows[0],
  });
  res.status(201).json({ reading: toDto(reading) });
});

readingsRouter.put('/:id', async (req, res) => {
  const id = parseId(req.params.id);
  const input = validateReadingInput(req.body, todayIn(config.timezone));

  // Ownership is part of the WHERE clause: someone else's id is indistinguishable from a missing one.
  const owned = await query('SELECT id FROM readings WHERE id = $1 AND user_id = $2', [id, req.userId]);
  if (!owned.rows[0]) throw notFound('Reading not found.');

  const reading = await writeReading({
    userId: req.userId,
    input,
    excludeId: id,
    write: async (client) => {
      const { rows } = await client.query(
        `UPDATE readings SET reading_date = $3, slot = $4, value = $5, updated_at = now()
         WHERE id = $1 AND user_id = $2 RETURNING ${COLUMNS}`,
        [id, req.userId, input.date, input.slot, input.value]
      );
      if (!rows[0]) throw notFound('Reading not found.');
      return rows[0];
    },
  });
  res.json({ reading: toDto(reading) });
});

readingsRouter.delete('/:id', async (req, res) => {
  const id = parseId(req.params.id);
  const { rowCount } = await query('DELETE FROM readings WHERE id = $1 AND user_id = $2', [id, req.userId]);
  if (!rowCount) throw notFound('Reading not found.');
  res.status(204).end();
});

