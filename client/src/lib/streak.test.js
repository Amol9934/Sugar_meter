import { describe, expect, test } from 'vitest';
import { currentStreak } from './streak.js';

describe('currentStreak', () => {
  test('returns 0 when neither today nor yesterday has a reading', () => {
    const today = '2026-11-12';
    expect(currentStreak([], today)).toBe(0);
    // 2 days ago has reading, but yesterday and today are empty
    expect(currentStreak(['2026-11-10'], today)).toBe(0);
  });

  test('today-not-yet-logged keeps yesterday streak (today never breaks the streak)', () => {
    const today = '2026-11-12';
    // Yesterday (11-11), and 2 days before (11-10, 11-09)
    const dates = ['2026-11-11', '2026-11-10', '2026-11-09'];
    expect(currentStreak(dates, today)).toBe(3);
  });

  test('today with a reading counts today and prior consecutive days', () => {
    const today = '2026-11-12';
    const dates = ['2026-11-12', '2026-11-11', '2026-11-10', '2026-11-09'];
    expect(currentStreak(dates, today)).toBe(4);
  });

  test('gap breaks the streak', () => {
    const today = '2026-11-12';
    // 11-12 logged, 11-11 missing, 11-10 and 11-09 logged
    expect(currentStreak(['2026-11-12', '2026-11-10', '2026-11-09'], today)).toBe(1);

    // Today not logged, 11-11 logged, 11-10 missing, 11-09 logged
    expect(currentStreak(['2026-11-11', '2026-11-09'], today)).toBe(1);
  });

  test('handles duplicates in input cleanly', () => {
    const today = '2026-11-12';
    const dates = ['2026-11-12', '2026-11-12', '2026-11-11', '2026-11-11', '2026-11-10'];
    expect(currentStreak(dates, today)).toBe(3);
  });

  test('crosses month boundaries', () => {
    const today = '2026-11-02';
    const dates = ['2026-11-02', '2026-11-01', '2026-10-31', '2026-10-30'];
    expect(currentStreak(dates, today)).toBe(4);

    // Today not logged on 1st of month
    const todayFirst = '2026-11-01';
    const datesPrior = ['2026-10-31', '2026-10-30'];
    expect(currentStreak(datesPrior, todayFirst)).toBe(2);
  });

  test('crosses year boundaries', () => {
    const today = '2026-01-02';
    const dates = ['2026-01-02', '2026-01-01', '2025-12-31', '2025-12-30'];
    expect(currentStreak(dates, today)).toBe(4);
  });

  test('handles leap year boundary (Feb 29)', () => {
    const today = '2024-03-01';
    const dates = ['2024-03-01', '2024-02-29', '2024-02-28'];
    expect(currentStreak(dates, today)).toBe(3);
  });
});
