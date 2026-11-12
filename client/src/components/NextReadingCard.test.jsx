import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import NextReadingCard from './NextReadingCard.jsx';

describe('NextReadingCard', () => {
  test('renders the suggestion and primary Log it button when a slot is next', async () => {
    const onLog = vi.fn();
    const user = userEvent.setup();

    render(
      <NextReadingCard
        slot="after_lunch"
        onLog={onLog}
      />
    );

    expect(screen.getByText(/After lunch is next/i)).toBeInTheDocument();
    const btn = screen.getByRole('button', { name: /Log After lunch reading/i });
    expect(btn).toBeInTheDocument();
    expect(btn).toHaveClass('primary');

    await user.click(btn);
    expect(onLog).toHaveBeenCalledWith('after_lunch');
  });

  test('renders all-done message when all slots are logged (slot is null)', () => {
    render(
      <NextReadingCard
        slot={null}
        onLog={vi.fn()}
      />
    );

    expect(screen.getByText('All four readings logged today.')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  test('computes next slot from loggedSlots and hour if slot is not provided', () => {
    render(
      <NextReadingCard
        loggedSlots={['morning_fasting']}
        hour={11}
        onLog={vi.fn()}
      />
    );

    expect(screen.getByText(/After breakfast is next/i)).toBeInTheDocument();
  });
});
