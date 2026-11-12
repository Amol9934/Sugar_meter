import { useState } from 'react';
import { SLOTS } from '../lib/slots.js';
import { SLOT_ICONS } from './Icons.jsx';

/** The day as a paper logbook: four fixed rows, filled or empty. */
export default function Logbook({ readings, activeSlot, onAdd, onEdit, onDelete }) {
  const [confirmId, setConfirmId] = useState(null);
  const bySlot = new Map(readings.map((r) => [r.slot, r]));

  return (
    <ol className="logbook" aria-label="Readings for the selected day">
      {SLOTS.map((s) => {
        const r = bySlot.get(s.key);
        const Icon = SLOT_ICONS[s.key];
        const cls = [r ? 'filled' : 'empty', activeSlot === s.key ? 'active' : ''].join(' ').trim();
        return (
          <li key={s.key} className={cls}>
            <span className="slot-icon"><Icon /></span>
            <span className="slot-name">{s.label}</span>
            {r ? (
              <span className="reading-value"><strong>{r.value}</strong><small>mg/dl</small></span>
            ) : (
              <span className="reading-value muted">Not logged</span>
            )}
            <span className="row-actions">
              {!r && (
                <button className="link" onClick={() => onAdd(s.key)} aria-label={`Add ${s.label} reading`}>Add</button>
              )}
              {r && confirmId !== r.id && (
                <>
                  <button className="link" onClick={() => onEdit(r)} aria-label={`Edit ${s.label} reading`}>Edit</button>
                  <button className="link danger" onClick={() => setConfirmId(r.id)} aria-label={`Delete ${s.label} reading`}>Delete</button>
                </>
              )}
              {r && confirmId === r.id && (
                <span className="confirm" role="group" aria-label="Confirm delete">
                  <span>Delete?</span>
                  <button className="link danger" onClick={() => { setConfirmId(null); onDelete(r); }}>Yes</button>
                  <button className="link" onClick={() => setConfirmId(null)}>Keep</button>
                </span>
              )}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
