import { describe, expect, test } from 'vitest';
import { nextSlot } from './nextSlot.js';

describe('nextSlot', () => {
  describe('every window (none logged)', () => {
    test('before 10 suggests morning_fasting', () => {
      expect(nextSlot({ loggedSlots: [], hour: 8 })).toBe('morning_fasting');
    });

    test('10-12 suggests after_breakfast', () => {
      expect(nextSlot({ loggedSlots: [], hour: 11 })).toBe('after_breakfast');
    });

    test('12-17 suggests after_lunch', () => {
      expect(nextSlot({ loggedSlots: [], hour: 14 })).toBe('after_lunch');
    });

    test('17+ suggests after_dinner', () => {
      expect(nextSlot({ loggedSlots: [], hour: 20 })).toBe('after_dinner');
    });
  });

  describe('boundary hours', () => {
    test('hour 9 is morning_fasting', () => {
      expect(nextSlot({ loggedSlots: [], hour: 9 })).toBe('morning_fasting');
    });

    test('hour 10 is after_breakfast', () => {
      expect(nextSlot({ loggedSlots: [], hour: 10 })).toBe('after_breakfast');
    });

    test('hour 12 is after_lunch', () => {
      expect(nextSlot({ loggedSlots: [], hour: 12 })).toBe('after_lunch');
    });

    test('hour 17 is after_dinner', () => {
      expect(nextSlot({ loggedSlots: [], hour: 17 })).toBe('after_dinner');
    });

    test('hour 0 is morning_fasting and hour 23 is after_dinner', () => {
      expect(nextSlot({ loggedSlots: [], hour: 0 })).toBe('morning_fasting');
      expect(nextSlot({ loggedSlots: [], hour: 23 })).toBe('after_dinner');
    });
  });

  describe('catch-up cases', () => {
    test('current window logged -> earliest unlogged earlier slot suggested', () => {
      // At lunch time (14:00), lunch is logged but morning and breakfast are missed
      expect(
        nextSlot({
          loggedSlots: ['after_lunch'],
          hour: 14,
        })
      ).toBe('morning_fasting');

      // Morning was logged, lunch was logged, breakfast was missed -> suggest breakfast
      expect(
        nextSlot({
          loggedSlots: ['morning_fasting', 'after_lunch'],
          hour: 14,
        })
      ).toBe('after_breakfast');
    });

    test('dinner window with dinner logged catches up on earliest missed slot', () => {
      expect(
        nextSlot({
          loggedSlots: ['after_dinner'],
          hour: 19,
        })
      ).toBe('morning_fasting');

      expect(
        nextSlot({
          loggedSlots: ['morning_fasting', 'after_dinner'],
          hour: 19,
        })
      ).toBe('after_breakfast');

      expect(
        nextSlot({
          loggedSlots: ['morning_fasting', 'after_breakfast', 'after_dinner'],
          hour: 19,
        })
      ).toBe('after_lunch');
    });
  });

  describe('later unlogged slots', () => {
    test('current and earlier windows logged -> suggests next later unlogged', () => {
      // In morning (hour 8), morning is logged -> suggests after_breakfast
      expect(
        nextSlot({
          loggedSlots: ['morning_fasting'],
          hour: 8,
        })
      ).toBe('after_breakfast');

      // In morning (hour 8), morning and breakfast logged -> suggests after_lunch
      expect(
        nextSlot({
          loggedSlots: ['morning_fasting', 'after_breakfast'],
          hour: 8,
        })
      ).toBe('after_lunch');

      // In breakfast (hour 11), morning and breakfast logged -> suggests after_lunch
      expect(
        nextSlot({
          loggedSlots: ['morning_fasting', 'after_breakfast'],
          hour: 11,
        })
      ).toBe('after_lunch');
    });
  });

  describe('all slots logged', () => {
    test('returns null when all four slots are logged at any hour', () => {
      const allFour = [
        'morning_fasting',
        'after_breakfast',
        'after_lunch',
        'after_dinner',
      ];
      expect(nextSlot({ loggedSlots: allFour, hour: 8 })).toBeNull();
      expect(nextSlot({ loggedSlots: allFour, hour: 10 })).toBeNull();
      expect(nextSlot({ loggedSlots: allFour, hour: 14 })).toBeNull();
      expect(nextSlot({ loggedSlots: allFour, hour: 20 })).toBeNull();
    });
  });
});
