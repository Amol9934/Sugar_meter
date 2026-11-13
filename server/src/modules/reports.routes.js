import { Router } from 'express';
import { query } from '../db/pool.js';
import { config } from '../config.js';
import { requireAuth } from '../middleware/auth.js';
import {
  todayIn,
  isValidIsoDate,
  monthToDateRange,
  previousMonthRange,
  rollingRange,
  previousRollingRange,
} from '../lib/dates.js';
import { MESSAGES } from '../lib/readingRules.js';
import { validationError } from '../lib/errors.js';
import { slotIndex, SLOT_KEYS } from '../lib/slots.js';
import { toDto } from './readings.routes.js';

export const reportsRouter = Router();
reportsRouter.use(requireAuth);

const ALLOWED_DAYS = new Set([7, 14, 30, 90]);

// GET /api/reports/summary?days=30&date=YYYY-MM-DD
reportsRouter.get('/summary', async (req, res) => {
  const today = todayIn(config.timezone);
  const date = req.query.date ?? today;
  if (!isValidIsoDate(date)) throw validationError(MESSAGES.dateInvalid, 'date');
  if (date > today) throw validationError(MESSAGES.dateFuture, 'date');

  const daysNum = Number(req.query.days);
  if (!ALLOWED_DAYS.has(daysNum)) {
    throw validationError('Choose 7, 14, 30 or 90 days.', 'days');
  }

  const range = rollingRange(date, daysNum);
  const previousRange = previousRollingRange(date, daysNum);

  const [overallRes, slotsRes, prevSlotsRes, dailyRes] = await Promise.all([
    query(
      `SELECT COUNT(*)::int                        AS count,
              MIN(value)::int                      AS lowest,
              MAX(value)::int                      AS highest,
              ROUND(AVG(value)::numeric, 1)::float8 AS average,
              COUNT(DISTINCT reading_date)::int    AS days_logged
         FROM readings
        WHERE user_id = $1 AND reading_date BETWEEN $2 AND $3`,
      [req.userId, range.from, range.to]
    ),
    query(
      `SELECT slot,
              COUNT(*)::int                        AS count,
              MIN(value)::int                      AS lowest,
              MAX(value)::int                      AS highest,
              ROUND(AVG(value)::numeric, 1)::float8 AS average
         FROM readings
        WHERE user_id = $1 AND reading_date BETWEEN $2 AND $3
        GROUP BY slot`,
      [req.userId, range.from, range.to]
    ),
    query(
      `SELECT slot,
              ROUND(AVG(value)::numeric, 1)::float8 AS average
         FROM readings
        WHERE user_id = $1 AND reading_date BETWEEN $2 AND $3
        GROUP BY slot`,
      [req.userId, previousRange.from, previousRange.to]
    ),
    query(
      `SELECT to_char(d.day, 'YYYY-MM-DD') AS date,
              COUNT(r.id)::int             AS count
         FROM generate_series($2::date, $3::date, '1 day'::interval) AS d(day)
         LEFT JOIN readings r
                ON r.reading_date = d.day::date
               AND r.user_id = $1
        GROUP BY d.day
        ORDER BY d.day ASC`,
      [req.userId, range.from, range.to]
    ),
  ]);

  const overallRow = overallRes.rows[0];
  const count = overallRow.count;
  const overall = {
    count,
    average: count === 0 ? null : overallRow.average,
    lowest: count === 0 ? null : overallRow.lowest,
    highest: count === 0 ? null : overallRow.highest,
  };
  const daysLogged = overallRow.days_logged;
  const completeness = Math.round((count / (daysNum * 4)) * 100);

  const currMap = new Map(slotsRes.rows.map((r) => [r.slot, r]));
  const prevMap = new Map(prevSlotsRes.rows.map((r) => [r.slot, r]));

  const slots = SLOT_KEYS.map((slot) => {
    const c = currMap.get(slot);
    const p = prevMap.get(slot);
    const sCount = c?.count ?? 0;
    const avg = sCount === 0 ? null : c?.average ?? null;
    const prevAvg = p?.average ?? null;
    let change = null;
    if (avg !== null && prevAvg !== null) {
      change = Number((avg - prevAvg).toFixed(1));
    }
    return {
      slot,
      count: sCount,
      average: avg,
      lowest: sCount === 0 ? null : c?.lowest ?? null,
      highest: sCount === 0 ? null : c?.highest ?? null,
      previousAverage: prevAvg,
      change,
    };
  });

  res.json({
    range,
    previousRange,
    days: daysNum,
    daysLogged,
    completeness,
    overall,
    slots,
    daily: dailyRes.rows,
  });
});

// GET /api/reports/trend?days=30&date=YYYY-MM-DD
reportsRouter.get('/trend', async (req, res) => {
  const today = todayIn(config.timezone);
  const date = req.query.date ?? today;
  if (!isValidIsoDate(date)) throw validationError(MESSAGES.dateInvalid, 'date');
  if (date > today) throw validationError(MESSAGES.dateFuture, 'date');

  const daysNum = Number(req.query.days);
  if (!ALLOWED_DAYS.has(daysNum)) {
    throw validationError('Choose 7, 14, 30 or 90 days.', 'days');
  }

  const range = rollingRange(date, daysNum);

  const result = await query(
    `SELECT to_char(d.day, 'YYYY-MM-DD') AS date,
            MAX(CASE WHEN r.slot = 'morning_fasting' THEN r.value END)::int AS morning_fasting,
            MAX(CASE WHEN r.slot = 'after_breakfast' THEN r.value END)::int AS after_breakfast,
            MAX(CASE WHEN r.slot = 'after_lunch' THEN r.value END)::int AS after_lunch,
            MAX(CASE WHEN r.slot = 'after_dinner' THEN r.value END)::int AS after_dinner
       FROM generate_series($2::date, $3::date, '1 day'::interval) AS d(day)
       LEFT JOIN readings r
              ON r.reading_date = d.day::date
             AND r.user_id = $1
      GROUP BY d.day
      ORDER BY d.day ASC`,
    [req.userId, range.from, range.to]
  );

  res.json({
    range,
    days: daysNum,
    points: result.rows,
  });
});

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
