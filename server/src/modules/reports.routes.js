import { Router } from 'express';
import { query } from '../db/pool.js';
import { config } from '../config.js';
import { requireAuth } from '../middleware/auth.js';
import { todayIn, isValidIsoDate, monthToDateRange, previousMonthRange } from '../lib/dates.js';
import { MESSAGES } from '../lib/readingRules.js';
import { validationError } from '../lib/errors.js';
import { slotIndex } from '../lib/slots.js';
import { toDto } from './readings.routes.js';

export const reportsRouter = Router();
reportsRouter.use(requireAuth);

/** Aggregates are computed by Postgres, not by pulling rows into JS. Empty range => count 0, rest null. */
async function statsFor(userId, { from, to }) {
  const { rows } = await query(
    `SELECT COUNT(*)::int                        AS count,
            MAX(value)::int                      AS highest,
            MIN(value)::int                      AS lowest,
            ROUND(AVG(value)::numeric, 1)::float8 AS average
       FROM readings
      WHERE user_id = $1 AND reading_date BETWEEN $2 AND $3`,
    [userId, from, to]
  );
  return rows[0];
}

// GET /api/reports?date=YYYY-MM-DD  -> daily + month-to-date + previous month, all relative to `date`
reportsRouter.get('/', async (req, res) => {
  const today = todayIn(config.timezone);
  const date = req.query.date ?? today;
  if (!isValidIsoDate(date)) throw validationError(MESSAGES.dateInvalid, 'date');
  if (date > today) throw validationError(MESSAGES.dateFuture, 'date');

  const dayRange = { from: date, to: date };
  const mtdRange = monthToDateRange(date);
  const prevRange = previousMonthRange(date);

  const [daily, mtd, prev, dayRows] = await Promise.all([
    statsFor(req.userId, dayRange),
    statsFor(req.userId, mtdRange),
    statsFor(req.userId, prevRange),
    query(
      `SELECT id, reading_date, slot, value, created_at, updated_at
         FROM readings WHERE user_id = $1 AND reading_date = $2`,
      [req.userId, date]
    ),
  ]);

  const readings = dayRows.rows.map(toDto).sort((a, b) => slotIndex(a.slot) - slotIndex(b.slot));

  res.json({
    date,
    daily: { range: dayRange, stats: daily, readings },
    monthToDate: { range: mtdRange, stats: mtd },
    previousMonth: { range: prevRange, stats: prev },
  });
});
