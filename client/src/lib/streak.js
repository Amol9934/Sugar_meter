import { addDays } from './dates.js';

/**
 * Counts consecutive days with at least one reading ending on `today`.
 * If today has no reading yet, starts counting from yesterday (today never breaks the streak).
 * Returns 0 if neither today nor yesterday has a reading.
 *
 * @param {string[]} loggedDates Array of 'YYYY-MM-DD' strings with >= 1 reading
 * @param {string} today 'YYYY-MM-DD'
 * @returns {number} Consecutive days
 */
export function currentStreak(loggedDates = [], today) {
  if (!today || !Array.isArray(loggedDates) || loggedDates.length === 0) {
    return 0;
  }

  const set = new Set(loggedDates);

  let startDate = null;
  if (set.has(today)) {
    startDate = today;
  } else {
    const yesterday = addDays(today, -1);
    if (set.has(yesterday)) {
      startDate = yesterday;
    } else {
      return 0;
    }
  }

  let count = 0;
  let cursor = startDate;
  while (set.has(cursor)) {
    count++;
    cursor = addDays(cursor, -1);
  }

  return count;
}
