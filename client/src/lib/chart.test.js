import { describe, expect, test } from 'vitest';
import {
  calculateYBounds,
  getGridLines,
  createScales,
  buildSegments,
  getXAxisTicks,
} from './chart.js';

describe('chart helpers', () => {
  describe('calculateYBounds', () => {
    test('returns fallbacks when points are empty or all null', () => {
      const bounds = calculateYBounds([]);
      expect(bounds).toEqual({ minY: 60, maxY: 200 });

      const nullBounds = calculateYBounds([
        { date: '2026-11-01', morning_fasting: null },
      ]);
      expect(nullBounds).toEqual({ minY: 60, maxY: 200 });
    });

    test('rounds min down and max up with padding', () => {
      const points = [
        { date: '2026-11-01', morning_fasting: 85 },
        { date: '2026-11-02', morning_fasting: 165 },
      ];
      const bounds = calculateYBounds(points);
      // min = 85 -> floor((85-10)/20)*20 = floor(75/20)*20 = 60
      // max = 165 -> ceil((165+10)/20)*20 = ceil(175/20)*20 = 180
      expect(bounds.minY).toBe(60);
      expect(bounds.maxY).toBe(180);
    });
  });

  describe('getGridLines', () => {
    test('returns gridline steps between minY and maxY', () => {
      const lines = getGridLines(60, 180, 50);
      expect(lines).toEqual([100, 150]);

      const lines50to200 = getGridLines(50, 200, 50);
      expect(lines50to200).toEqual([50, 100, 150, 200]);
    });
  });

  describe('createScales', () => {
    test('scales x and y within plot bounds', () => {
      const { scaleX, scaleY } = createScales({
        totalPoints: 11,
        minY: 0,
        maxY: 100,
        width: 500,
        height: 300,
        padding: { top: 20, right: 30, bottom: 40, left: 50 },
      });

      // plotWidth = 500 - 50 - 30 = 420
      // plotHeight = 300 - 20 - 40 = 240
      expect(scaleX(0)).toBe(50);
      expect(scaleX(10)).toBe(470);
      expect(scaleX(5)).toBe(260);

      expect(scaleY(100)).toBe(20);
      expect(scaleY(0)).toBe(260);
      expect(scaleY(50)).toBe(140);
    });
  });

  describe('buildSegments (handling gaps)', () => {
    const scales = {
      scaleX: (i) => i * 10,
      scaleY: (v) => 200 - v,
    };

    test('groups consecutive readings into a single segment', () => {
      const points = [
        { date: '2026-11-01', morning_fasting: 90 },
        { date: '2026-11-02', morning_fasting: 95 },
        { date: '2026-11-03', morning_fasting: 100 },
      ];
      const segments = buildSegments(points, 'morning_fasting', scales);
      expect(segments).toHaveLength(1);
      expect(segments[0]).toHaveLength(3);
      expect(segments[0][0].value).toBe(90);
      expect(segments[0][2].value).toBe(100);
    });

    test('splits readings into separate segments across null gaps (does not connect across nulls)', () => {
      const points = [
        { date: '2026-11-01', morning_fasting: 90 },
        { date: '2026-11-02', morning_fasting: 95 },
        { date: '2026-11-03', morning_fasting: null }, // gap
        { date: '2026-11-04', morning_fasting: null }, // gap
        { date: '2026-11-05', morning_fasting: 105 },
        { date: '2026-11-06', morning_fasting: 110 },
      ];
      const segments = buildSegments(points, 'morning_fasting', scales);
      expect(segments).toHaveLength(2);
      expect(segments[0]).toHaveLength(2);
      expect(segments[0].map((p) => p.date)).toEqual(['2026-11-01', '2026-11-02']);

      expect(segments[1]).toHaveLength(2);
      expect(segments[1].map((p) => p.date)).toEqual(['2026-11-05', '2026-11-06']);
    });

    test('retains isolated points with gaps on both sides', () => {
      const points = [
        { date: '2026-11-01', morning_fasting: null },
        { date: '2026-11-02', morning_fasting: 95 },
        { date: '2026-11-03', morning_fasting: null },
      ];
      const segments = buildSegments(points, 'morning_fasting', scales);
      expect(segments).toHaveLength(1);
      expect(segments[0]).toHaveLength(1);
      expect(segments[0][0].value).toBe(95);
    });

    test('returns empty array when all points are null for slot', () => {
      const points = [
        { date: '2026-11-01', morning_fasting: null },
        { date: '2026-11-02', morning_fasting: null },
      ];
      const segments = buildSegments(points, 'morning_fasting', scales);
      expect(segments).toEqual([]);
    });
  });

  describe('getXAxisTicks', () => {
    test('selects first, last, and every Nth tick', () => {
      const points = Array.from({ length: 15 }, (_, i) => ({
        date: `2026-11-${String(i + 1).padStart(2, '0')}`,
      }));
      const ticks = getXAxisTicks(points, 7);
      expect(ticks.map((t) => t.index)).toEqual([0, 7, 14]);
    });
  });
});

