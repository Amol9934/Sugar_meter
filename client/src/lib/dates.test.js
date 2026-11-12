import { addDays, formatDate, formatLong, formatRange, greeting } from './dates.js';

describe('client date helpers', () => {
  test('addDays crosses month and year boundaries', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
  });

  test('formatLong names the weekday correctly', () => {
    expect(formatLong('2026-11-12')).toBe('Thursday, 12 November 2026');
  });

  test('formatRange shows the year once when both ends share it', () => {
    expect(formatRange({ from: '2026-10-01', to: '2026-10-15' })).toBe('1 Oct – 15 Oct 2026');
    expect(formatRange({ from: '2025-12-01', to: '2026-01-05' })).toBe('1 Dec 2025 – 5 Jan 2026');
    expect(formatRange({ from: '2026-10-15', to: '2026-10-15' })).toBe(formatDate('2026-10-15'));
  });

  test('greeting follows the hour', () => {
    expect([greeting(7), greeting(13), greeting(20)]).toEqual(['Good morning', 'Good afternoon', 'Good evening']);
  });
});
