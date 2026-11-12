import { useEffect, useRef, useState } from 'react';
import { SLOTS } from '../lib/slots.js';
import { formatDate } from '../lib/dates.js';
import { validateReading } from '../lib/validate.js';

/**
 * Adds a reading, or edits one when `editing` is set.
 * `takenSlots` are slots already logged for `date` (the reading being edited excluded)
 * so we can disable them; the server still enforces the rule.
 */
export default function ReadingForm({ date, today, editing, presetSlot, takenSlots = [], onSubmit, onCancel }) {
  const [slot, setSlot] = useState(editing?.slot ?? presetSlot ?? '');
  const [value, setValue] = useState(editing ? String(editing.value) : '');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const valueRef = useRef(null);

  // Follow whichever row the user picked (Add / Edit) in the logbook.
  useEffect(() => {
    setSlot(editing?.slot ?? presetSlot ?? '');
    setValue(editing ? String(editing.value) : '');
    setError(null);
    // Clicking Add/Edit in the logbook should land the cursor in the value box, ready to type.
    if (editing || presetSlot) {
      valueRef.current?.focus();
      valueRef.current?.scrollIntoView?.({ block: 'nearest' });
    }
  }, [editing, presetSlot]);

  async function submit(e) {
    e.preventDefault();
    setError(null);
    if (!slot) return setError({ field: 'slot', message: 'Please choose a time slot.' });
    const invalid = validateReading({ value, date }, today);
    if (invalid) return setError(invalid);

    setBusy(true);
    try {
      await onSubmit({ date, slot, value: Number(value) });
      setValue('');
      if (!editing) setSlot('');
    } catch (err) {
      setError({ field: err.field, message: err.message });
    } finally {
      setBusy(false);
    }
  }

  const showFor = (f) => (error?.field === f ? error.message : null);

  return (
    <form onSubmit={submit} className="reading-form" noValidate aria-label={editing ? 'Edit reading' : 'Add reading'}>
      <h3>{editing ? 'Edit reading' : 'Add a reading'} <span className="muted">for {formatDate(date)}</span></h3>
      <div className="form-row">
        <label>Time slot
          <select value={slot} onChange={(e) => setSlot(e.target.value)}>
            <option value="">Choose…</option>
            {SLOTS.map((s) => (
              <option key={s.key} value={s.key} disabled={takenSlots.includes(s.key)}>
                {s.label}{takenSlots.includes(s.key) ? ' (logged)' : ''}
              </option>
            ))}
          </select>
          {showFor('slot') && <span className="field-error">{showFor('slot')}</span>}
        </label>
        <label>Glucose (mg/dl)
          <span className="input-unit">
            <input ref={valueRef} inputMode="numeric" autoComplete="off" value={value}
              onChange={(e) => setValue(e.target.value)} placeholder="e.g. 110" />
            <span aria-hidden="true">mg/dl</span>
          </span>
          {showFor('value') && <span className="field-error">{showFor('value')}</span>}
        </label>
      </div>
      {error && !['slot', 'value'].includes(error.field) && (
        <p role="alert" className="form-error">{error.message}</p>
      )}
      <div className="actions">
        <button className="primary" disabled={busy}>{editing ? 'Save changes' : 'Add reading'}</button>
        {editing && <button type="button" className="ghost" onClick={onCancel}>Cancel</button>}
      </div>
    </form>
  );
}
