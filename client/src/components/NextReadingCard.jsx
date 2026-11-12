import { slotLabel } from '../lib/slots.js';
import { nextSlot } from '../lib/nextSlot.js';

export default function NextReadingCard({ slot, loggedSlots, hour, onLog }) {
  const targetSlot = slot !== undefined ? slot : nextSlot({ loggedSlots, hour: hour ?? new Date().getHours() });

  if (targetSlot === null) {
    return (
      <aside className="next-card all-done" aria-label="Next reading status">
        <p className="next-card-text">All four readings logged today.</p>
      </aside>
    );
  }

  return (
    <aside className="next-card" aria-label="Next reading suggestion">
      <div className="next-card-content">
        <p className="next-card-text">
          {slotLabel(targetSlot)} is next
        </p>
        <button
          type="button"
          className="primary small"
          onClick={() => onLog(targetSlot)}
          aria-label={`Log ${slotLabel(targetSlot)} reading`}
        >
          Log it
        </button>
      </div>
    </aside>
  );
}
