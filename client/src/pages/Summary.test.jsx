import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, test, vi, beforeEach } from 'vitest';
import Summary from './Summary.jsx';
import { api } from '../api.js';

vi.mock('../AuthContext.jsx', () => ({
  useAuth: () => ({
    user: { name: 'Taylor Swift' },
    logout: vi.fn(),
  }),
}));

const mockSummaryData = {
  range: { from: '2026-10-14', to: '2026-11-12' },
  previousRange: { from: '2026-09-14', to: '2026-10-13' },
  days: 30,
  daysLogged: 20,
  completeness: 55,
  overall: { count: 66, average: 124.5, lowest: 80, highest: 195 },
  slots: [
    { slot: 'morning_fasting', count: 20, average: 95.0, lowest: 80, highest: 110, previousAverage: 87.0, change: 8 },
    { slot: 'after_breakfast', count: 18, average: 135.0, lowest: 115, highest: 160, previousAverage: 140.0, change: -5 },
    { slot: 'after_lunch', count: 16, average: 128.0, lowest: 105, highest: 155, previousAverage: null, change: null },
    { slot: 'after_dinner', count: 12, average: 140.0, lowest: 110, highest: 195, previousAverage: 140.0, change: 0 },
  ],
  daily: [
    { date: '2026-11-10', count: 3 },
    { date: '2026-11-11', count: 4 },
    { date: '2026-11-12', count: 2 },
  ],
};

const emptySummaryData = {
  range: { from: '2026-10-14', to: '2026-11-12' },
  previousRange: { from: '2026-09-14', to: '2026-10-13' },
  days: 30,
  daysLogged: 0,
  completeness: 0,
  overall: { count: 0, average: null, lowest: null, highest: null },
  slots: [
    { slot: 'morning_fasting', count: 0, average: null, lowest: null, highest: null, previousAverage: null, change: null },
    { slot: 'after_breakfast', count: 0, average: null, lowest: null, highest: null, previousAverage: null, change: null },
    { slot: 'after_lunch', count: 0, average: null, lowest: null, highest: null, previousAverage: null, change: null },
    { slot: 'after_dinner', count: 0, average: null, lowest: null, highest: null, previousAverage: null, change: null },
  ],
  daily: [],
};

describe('Summary Page', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  test('renders rows for all 4 slots from a mocked API response', async () => {
    vi.spyOn(api, 'summary').mockResolvedValue(mockSummaryData);

    render(
      <MemoryRouter>
        <Summary />
      </MemoryRouter>
    );

    expect(await screen.findByRole('rowheader', { name: 'Morning (fasting)' })).toBeInTheDocument();
    expect(screen.getByRole('rowheader', { name: 'After breakfast' })).toBeInTheDocument();
    expect(screen.getByRole('rowheader', { name: 'After lunch' })).toBeInTheDocument();
    expect(screen.getByRole('rowheader', { name: 'After dinner' })).toBeInTheDocument();
    expect(screen.getByRole('rowheader', { name: 'Overall' })).toBeInTheDocument();
  });

  test('shows the empty state when there are no readings', async () => {
    vi.spyOn(api, 'summary').mockResolvedValue(emptySummaryData);

    render(
      <MemoryRouter>
        <Summary />
      </MemoryRouter>
    );

    expect(await screen.findByText('No readings recorded for this period.')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  test('switching to 7 days refetches with days=7', async () => {
    const summarySpy = vi.spyOn(api, 'summary').mockResolvedValue(mockSummaryData);
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <Summary />
      </MemoryRouter>
    );

    await screen.findByRole('rowheader', { name: 'Morning (fasting)' });
    expect(summarySpy).toHaveBeenCalledWith(30);

    const sevenDaysBtn = screen.getByRole('button', { name: '7 days' });
    await user.click(sevenDaysBtn);

    await waitFor(() => {
      expect(summarySpy).toHaveBeenCalledWith(7);
    });
    expect(sevenDaysBtn).toHaveAttribute('aria-pressed', 'true');
  });

  test('change values render as "+8" / "-5" / "-"', async () => {
    vi.spyOn(api, 'summary').mockResolvedValue(mockSummaryData);

    render(
      <MemoryRouter>
        <Summary />
      </MemoryRouter>
    );

    expect(await screen.findByText('+8')).toBeInTheDocument();
    expect(screen.getByText('-5')).toBeInTheDocument();
    expect(screen.getAllByText('-').length).toBeGreaterThan(0);
  });
});

