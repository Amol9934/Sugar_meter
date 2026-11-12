/**
 * Calendar dates are plain 'YYYY-MM-DD' strings end to end (API, JS, and the
 * Postgres DATE column). We never build a JS Date from a local string, which is
 * the classic source of off-by-one-day timezone bugs.
 */

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isValidIsoDate(value) {
  if (typeof value !== 'string') return false;
  const m = ISO_DATE.exec(value);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const probe = new Date(Date.UTC(y, mo - 1, d));
  // Round-trip rejects impossible dates like 2026-02-30.
  return probe.getUTCFullYear() === y && probe.getUTCMonth() === mo - 1 && probe.getUTCDate() === d;
}

const pad = (n) => String(n).padStart(2, '0');
const fmt = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`;

/** Today's calendar date in the given IANA timezone. */
export function todayIn(timeZone, now = new Date()) {
  // The 'en-CA' locale formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', { timeZone }).format(now);
}

/** 1st of the selected month through the selected date. */
export function monthToDateRange(date) {
  const [y, m] = date.split('-').map(Number);
  return { from: fmt(y, m, 1), to: date };
}

/** The whole calendar month before the selected date's month. */
export function previousMonthRange(date) {
  const [y, m] = date.split('-').map(Number);
  const prevY = m === 1 ? y - 1 : y;
  const prevM = m === 1 ? 12 : m - 1;
  // Day 0 of month m is the last day of month m-1 (handles 28/29/30/31 and leap years).
  const lastDay = new Date(Date.UTC(y, m - 1, 0)).getUTCDate();
  return { from: fmt(prevY, prevM, 1), to: fmt(prevY, prevM, lastDay) };
}

/** Calendar arithmetic in UTC so daylight-saving shifts can never move a date. */
export function addDays(iso, n) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

/** Exactly `days` days ending on `endDate` inclusive. */
export function rollingRange(endDate, days) {
  return {
    from: addDays(endDate, -(days - 1)),
    to: endDate,
  };
}

/** Exactly `days` days immediately preceding `rollingRange(endDate, days)`. */
export function previousRollingRange(endDate, days) {
  const current = rollingRange(endDate, days);
  return {
    from: addDays(current.from, -days),
    to: addDays(current.from, -1),
  };
}
