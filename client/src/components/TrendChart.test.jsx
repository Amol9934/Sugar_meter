import { render, screen, within } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import TrendChart from './TrendChart.jsx';

const mockTrend = {
  range: { from: '2026-11-06', to: '2026-11-12' },
  days: 7,
  points: [
    {
      date: '2026-11-06',
      morning_fasting: 92,
      after_breakfast: null,
      after_lunch: 135,
      after_dinner: null,
    },
    {
      date: '2026-11-07',
      morning_fasting: null,
      after_breakfast: null,
      after_lunch: null,
      after_dinner: null,
    },
    {
      date: '2026-11-08',
      morning_fasting: null,
      after_breakfast: 142,
      after_lunch: null,
      after_dinner: 155,
    },
    {
      date: '2026-11-09',
      morning_fasting: 100,
      after_breakfast: null,
      after_lunch: 120,
      after_dinner: null,
    },
    {
      date: '2026-11-10',
      morning_fasting: null,
      after_breakfast: 130,
      after_lunch: null,
      after_dinner: null,
    },
    {
      date: '2026-11-11',
      morning_fasting: null,
      after_breakfast: null,
      after_lunch: null,
      after_dinner: null,
    },
    {
      date: '2026-11-12',
      morning_fasting: 98,
      after_breakfast: null,
      after_lunch: null,
      after_dinner: null,
    },
  ],
};

describe('TrendChart', () => {
  test('renders the legend and the accessible data table fallback', () => {
    render(<TrendChart trend={mockTrend} />);

    // 1. Checks legend
    const legend = screen.getByLabelText(/Chart legend/i);
    expect(legend).toBeInTheDocument();
    expect(within(legend).getByText('Morning (fasting)')).toBeInTheDocument();
    expect(within(legend).getByText('After breakfast')).toBeInTheDocument();
    expect(within(legend).getByText('After lunch')).toBeInTheDocument();
    expect(within(legend).getByText('After dinner')).toBeInTheDocument();

    // 2. Checks SVG role="img" and aria-label
    const svgImg = screen.getByRole('img', { name: /Glucose trend from 2026-11-06 to 2026-11-12/i });
    expect(svgImg).toBeInTheDocument();

    // 3. Checks accessible table render
    const table = screen.getByRole('table');
    expect(table).toBeInTheDocument();
    expect(within(table).getByText('Glucose trend from 2026-11-06 to 2026-11-12 over 7 days')).toBeInTheDocument();
    expect(within(table).getByText('92 mg/dl')).toBeInTheDocument();
    expect(within(table).getByText('142 mg/dl')).toBeInTheDocument();
    expect(within(table).getAllByText('No reading').length).toBeGreaterThan(0);
  });
});
