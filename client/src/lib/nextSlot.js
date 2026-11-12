export const SLOT_ORDER = [
  'morning_fasting',
  'after_breakfast',
  'after_lunch',
  'after_dinner',
];

/**
 * Determines the next slot to suggest based on local hour and logged slots.
 *
 * Windows (local hour):
 * - < 10: morning_fasting
 * - 10-12 (10 <= hour < 12): after_breakfast
 * - 12-17 (12 <= hour < 17): after_lunch
 * - 17+: after_dinner
 *
 * Rule:
 * 1. Suggest the current window's slot if not logged.
 * 2. Otherwise, the earliest not-yet-logged slot of an earlier window ("catch-up").
 * 3. Otherwise, the next later unlogged slot.
 * 4. Return null when all 4 are logged.
 */
export function nextSlot({ loggedSlots = [], hour }) {
  const logged = new Set(loggedSlots || []);
  if (SLOT_ORDER.every((s) => logged.has(s))) {
    return null;
  }

  let currentSlot;
  if (hour < 10) {
    currentSlot = 'morning_fasting';
  } else if (hour < 12) {
    currentSlot = 'after_breakfast';
  } else if (hour < 17) {
    currentSlot = 'after_lunch';
  } else {
    currentSlot = 'after_dinner';
  }

  // 1. Current window's slot if not logged
  if (!logged.has(currentSlot)) {
    return currentSlot;
  }

  const currentIndex = SLOT_ORDER.indexOf(currentSlot);

  // 2. Earliest unlogged earlier slot (catch-up)
  for (let i = 0; i < currentIndex; i++) {
    if (!logged.has(SLOT_ORDER[i])) {
      return SLOT_ORDER[i];
    }
  }

  // 3. Next later unlogged slot
  for (let i = currentIndex + 1; i < SLOT_ORDER.length; i++) {
    if (!logged.has(SLOT_ORDER[i])) {
      return SLOT_ORDER[i];
    }
  }

  return null;
}
