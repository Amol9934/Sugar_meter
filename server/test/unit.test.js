import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { isValidIsoDate, monthToDateRange, previousMonthRange, todayIn } from '../src/lib/dates.js';
import { validateReadingInput, assertCanStore, MESSAGES } from '../src/lib/readingRules.js';

const TODAY = '2026-10-15';
const ok = { date: '2026-10-15', slot: 'after_lunch', value: 120 };
const msg = (fn) => {
  try { fn(); } catch (e) { return e.message; }
  return null;
};

describe('date ranges', () => {
  test('month-to-date runs from the 1st to the selected date', () => {
    assert.deepEqual(monthToDateRange('2026-10-15'), { from: '2026-10-01', to: '2026-10-15' });
    assert.deepEqual(monthToDateRange('2026-10-01'), { from: '2026-10-01', to: '2026-10-01' });
  });

  test('previous month matches the assignment example', () => {
    assert.deepEqual(previousMonthRange('2026-10-15'), { from: '2026-09-01', to: '2026-09-30' });
  });

  test('previous month crosses the year boundary', () => {
    assert.deepEqual(previousMonthRange('2026-01-10'), { from: '2025-12-01', to: '2025-12-31' });
  });

  test('previous month handles leap and non-leap February', () => {
    assert.equal(previousMonthRange('2028-03-05').to, '2028-02-29');
    assert.equal(previousMonthRange('2026-03-05').to, '2026-02-28');
  });

  test('previous month from a 31-day month end is still the whole prior month', () => {
    assert.deepEqual(previousMonthRange('2026-03-31'), { from: '2026-02-01', to: '2026-02-28' });
  });

  test('isValidIsoDate rejects impossible and malformed dates', () => {
    assert.equal(isValidIsoDate('2026-02-30'), false);
    assert.equal(isValidIsoDate('2026-13-01'), false);
    assert.equal(isValidIsoDate('15/10/2026'), false);
    assert.equal(isValidIsoDate(20261015), false);
    assert.equal(isValidIsoDate('2028-02-29'), true);
  });

  test('todayIn respects the timezone (the same instant is a different date in IST vs LA)', () => {
    const instant = new Date('2026-10-15T20:00:00Z');
    assert.equal(todayIn('Asia/Kolkata', instant), '2026-10-16');
    assert.equal(todayIn('America/Los_Angeles', instant), '2026-10-15');
  });
});

describe('reading validation', () => {
  test('accepts a valid reading and the boundary values', () => {
    assert.deepEqual(validateReadingInput(ok, TODAY), ok);
    assert.equal(validateReadingInput({ ...ok, value: 40 }, TODAY).value, 40);
    assert.equal(validateReadingInput({ ...ok, value: 600 }, TODAY).value, 600);
  });

  test('value is required', () => {
    for (const value of [undefined, null, '', '   ']) {
      assert.equal(msg(() => validateReadingInput({ ...ok, value }, TODAY)), 'Please enter a glucose value.');
    }
  });

  test('value must be a whole number between 40 and 600', () => {
    for (const value of [39, 601, 0, -5, 120.5, '120.5', 'abc', NaN, '12a']) {
      assert.equal(
        msg(() => validateReadingInput({ ...ok, value }, TODAY)),
        'Value must be between 40 and 600 mg/dl.',
        `value=${value}`
      );
    }
  });

  test('numeric strings from an HTML input are accepted', () => {
    assert.equal(validateReadingInput({ ...ok, value: '135' }, TODAY).value, 135);
  });

  test('future dates are rejected, today is allowed', () => {
    assert.equal(msg(() => validateReadingInput({ ...ok, date: '2026-10-16' }, TODAY)), 'Date cannot be in the future.');
    assert.doesNotThrow(() => validateReadingInput({ ...ok, date: TODAY }, TODAY));
  });

  test('unknown slot and malformed date are rejected', () => {
    assert.equal(msg(() => validateReadingInput({ ...ok, slot: 'midnight' }, TODAY)), MESSAGES.slotInvalid);
    assert.equal(msg(() => validateReadingInput({ ...ok, date: '2026-02-30' }, TODAY)), MESSAGES.dateInvalid);
  });
});

describe('storage rules', () => {
  test('rejects a second reading in the same slot with the slot name in the message', () => {
    assert.equal(
      msg(() => assertCanStore(['after_lunch'], 'after_lunch')),
      'You already have an After lunch reading for this date.'
    );
  });

  test('duplicate message wins over the daily maximum on a full day', () => {
    const full = ['morning_fasting', 'after_breakfast', 'after_lunch', 'after_dinner'];
    assert.match(msg(() => assertCanStore(full, 'after_lunch')), /already have an After lunch/);
  });

  test('daily maximum guard fires when 4 readings exist and the slot is new', () => {
    // Unreachable through the API today (4 slots), so the guard is tested directly.
    const four = ['a', 'b', 'c', 'd'];
    assert.equal(msg(() => assertCanStore(four, 'e')), 'You can add only 4 readings per day.');
  });

  test('allows a new slot when the day has room', () => {
    assert.doesNotThrow(() => assertCanStore(['morning_fasting'], 'after_lunch'));
  });
});
