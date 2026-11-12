// Mirrors server/src/lib/slots.js. The server remains the source of truth for validation.
export const SLOTS = [
  { key: 'morning_fasting', label: 'Morning (fasting)' },
  { key: 'after_breakfast', label: 'After breakfast' },
  { key: 'after_lunch', label: 'After lunch' },
  { key: 'after_dinner', label: 'After dinner' },
];
export const slotLabel = (key) => SLOTS.find((s) => s.key === key)?.label ?? key;
