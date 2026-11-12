import { validationError, conflictError } from './errors.js';
import { isValidIsoDate } from './dates.js';
import { SLOT_KEYS, MAX_READINGS_PER_DAY, MIN_VALUE, MAX_VALUE, slotLabel } from './slots.js';

export const MESSAGES = {
  valueRequired: 'Please enter a glucose value.',
  valueRange: `Value must be between ${MIN_VALUE} and ${MAX_VALUE} mg/dl.`,
  slotInvalid: 'Please choose a time slot.',
  dateInvalid: 'Please enter a valid date.',
  dateFuture: 'Date cannot be in the future.',
  maxPerDay: `You can add only ${MAX_READINGS_PER_DAY} readings per day.`,
  duplicateSlot: (slot) => `You already have an ${slotLabel(slot)} reading for this date.`,
};

/** Accepts 120 or "120"; rejects 120.5, "12a", "", null. */
function parseValue(raw) {
  if (raw === undefined || raw === null || (typeof raw === 'string' && raw.trim() === '')) {
    throw validationError(MESSAGES.valueRequired, 'value');
  }
  let n = raw;
  if (typeof raw === 'string') {
    if (!/^-?\d+(\.\d+)?$/.test(raw.trim())) throw validationError(MESSAGES.valueRange, 'value');
    n = Number(raw);
  }
  if (typeof n !== 'number' || !Number.isInteger(n) || n < MIN_VALUE || n > MAX_VALUE) {
    throw validationError(MESSAGES.valueRange, 'value');
  }
  return n;
}

/**
 * Pure input validation. Throws the first failing rule, in the order the UI shows the fields.
 * `today` is injected (YYYY-MM-DD) so this stays deterministic in tests.
 */
export function validateReadingInput(body, today) {
  const input = body ?? {};
  const value = parseValue(input.value);

  if (!SLOT_KEYS.includes(input.slot)) throw validationError(MESSAGES.slotInvalid, 'slot');

  if (!isValidIsoDate(input.date)) throw validationError(MESSAGES.dateInvalid, 'date');
  // ISO dates compare correctly as strings.
  if (input.date > today) throw validationError(MESSAGES.dateFuture, 'date');

  return { value, slot: input.slot, date: input.date };
}

/**
 * Business rules that depend on what is already stored for that day.
 * `existingSlots` must exclude the reading being edited (if any).
 * The duplicate check runs first because it is the more specific message.
 * With exactly 4 slots the max-4 rule is implied by the unique-slot rule, but it is kept
 * as an explicit guard so the rule survives if slots are ever added or loosened.
 */
export function assertCanStore(existingSlots, slot) {
  if (existingSlots.includes(slot)) throw conflictError(MESSAGES.duplicateSlot(slot), 'slot');
  if (existingSlots.length >= MAX_READINGS_PER_DAY) {
    throw conflictError(MESSAGES.maxPerDay, 'date');
  }
}
