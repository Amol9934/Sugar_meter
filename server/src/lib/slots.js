// Order matters: it is the order a patient's day unfolds, and the order we display.
export const SLOTS = [
  { key: 'morning_fasting', label: 'Morning (fasting)' },
  { key: 'after_breakfast', label: 'After breakfast' },
  { key: 'after_lunch', label: 'After lunch' },
  { key: 'after_dinner', label: 'After dinner' },
];

export const SLOT_KEYS = SLOTS.map((s) => s.key);
export const MAX_READINGS_PER_DAY = SLOTS.length;
export const MIN_VALUE = 40;
export const MAX_VALUE = 600;

export const slotLabel = (key) => SLOTS.find((s) => s.key === key)?.label ?? key;
export const slotIndex = (key) => SLOT_KEYS.indexOf(key);
