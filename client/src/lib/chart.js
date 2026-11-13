export const CHART_SLOTS = [
  { key: 'morning_fasting', label: 'Morning (fasting)', color: '#0072b2', shape: 'circle' },
  { key: 'after_breakfast', label: 'After breakfast', color: '#e69f00', shape: 'square' },
  { key: 'after_lunch', label: 'After lunch', color: '#009e73', shape: 'triangle' },
  { key: 'after_dinner', label: 'After dinner', color: '#cc79a7', shape: 'diamond' },
];

/**
 * Computes Y-axis min and max bounds based on values in points.
 */
export function calculateYBounds(points = [], fallbackMin = 60, fallbackMax = 200) {
  let min = Infinity;
  let max = -Infinity;

  for (const pt of points) {
    for (const slot of CHART_SLOTS) {
      const v = pt[slot.key];
      if (typeof v === 'number') {
        if (v < min) min = v;
        if (v > max) max = v;
      }
    }
  }

  if (min === Infinity || max === -Infinity) {
    return { minY: fallbackMin, maxY: fallbackMax };
  }

  // Pad slightly and round to multiples of 20
  const floorMin = Math.max(40, Math.floor((min - 10) / 20) * 20);
  const ceilMax = Math.min(600, Math.ceil((max + 10) / 20) * 20);

  return {
    minY: floorMin,
    maxY: Math.max(floorMin + 40, ceilMax),
  };
}

/**
 * Returns gridline y-values.
 */
export function getGridLines(minY, maxY, step = 50) {
  const lines = [];
  const start = Math.ceil(minY / step) * step;
  for (let y = start; y <= maxY; y += step) {
    lines.push(y);
  }
  return lines;
}

/**
 * Creates linear scaling functions for X and Y coordinates.
 */
export function createScales({ totalPoints, minY, maxY, width, height, padding }) {
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  const scaleX = (index) => {
    if (totalPoints <= 1) return padding.left + plotWidth / 2;
    return padding.left + (index / (totalPoints - 1)) * plotWidth;
  };

  const scaleY = (value) => {
    if (maxY === minY) return padding.top + plotHeight / 2;
    return padding.top + plotHeight - ((value - minY) / (maxY - minY)) * plotHeight;
  };

  return { scaleX, scaleY, plotWidth, plotHeight };
}

/**
 * Groups consecutive non-null readings into segments so gaps are not connected.
 */
export function buildSegments(points, slotKey, { scaleX, scaleY }) {
  const segments = [];
  let current = [];

  points.forEach((pt, i) => {
    const val = pt[slotKey];
    if (val !== null && val !== undefined) {
      current.push({
        index: i,
        x: Number(scaleX(i).toFixed(1)),
        y: Number(scaleY(val).toFixed(1)),
        value: val,
        date: pt.date,
      });
    } else if (current.length > 0) {
      segments.push(current);
      current = [];
    }
  });

  if (current.length > 0) {
    segments.push(current);
  }

  return segments;
}

/**
 * Chooses approximately targetInterval days apart for X axis ticks.
 */
export function getXAxisTicks(points, targetInterval = 7) {
  if (!points || points.length === 0) return [];
  const ticks = [];
  const len = points.length;

  for (let i = 0; i < len; i++) {
    if (i === 0 || i === len - 1 || i % targetInterval === 0) {
      ticks.push({ index: i, date: points[i].date });
    }
  }

  return ticks;
}

