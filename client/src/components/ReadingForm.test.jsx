import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import ReadingForm from './ReadingForm.jsx';

const setup = (props = {}) => {
  const onSubmit = vi.fn().mockResolvedValue();
  render(<ReadingForm date="2026-10-15" today="2026-10-15" onSubmit={onSubmit} {...props} />);
  return { onSubmit, user: userEvent.setup() };
};

describe('ReadingForm', () => {
  test('asks for a value when it is empty and does not submit', async () => {
    const { onSubmit, user } = setup();
    await user.selectOptions(screen.getByLabelText(/time slot/i), 'after_lunch');
    await user.click(screen.getByRole('button', { name: /add reading/i }));
    expect(screen.getByText('Please enter a glucose value.')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  test.each(['39', '601', '99.5', 'abc'])('rejects %s with the range message', async (bad) => {
    const { onSubmit, user } = setup();
    await user.selectOptions(screen.getByLabelText(/time slot/i), 'after_lunch');
    await user.type(screen.getByLabelText(/glucose/i), bad);
    await user.click(screen.getByRole('button', { name: /add reading/i }));
    expect(screen.getByText('Value must be between 40 and 600 mg/dl.')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  test('blocks a future date', async () => {
    const { onSubmit, user } = setup({ date: '2026-10-16' });
    await user.selectOptions(screen.getByLabelText(/time slot/i), 'after_lunch');
    await user.type(screen.getByLabelText(/glucose/i), '120');
    await user.click(screen.getByRole('button', { name: /add reading/i }));
    expect(screen.getByText('Date cannot be in the future.')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  test('submits a valid reading as numbers', async () => {
    const { onSubmit, user } = setup();
    await user.selectOptions(screen.getByLabelText(/time slot/i), 'after_lunch');
    await user.type(screen.getByLabelText(/glucose/i), '135');
    await user.click(screen.getByRole('button', { name: /add reading/i }));
    expect(onSubmit).toHaveBeenCalledWith({ date: '2026-10-15', slot: 'after_lunch', value: 135 });
  });

  test("shows the server's message when the API rejects the reading", async () => {
    const err = Object.assign(new Error('You already have an After lunch reading for this date.'), { field: 'slot' });
    const { user } = setup({ onSubmit: vi.fn().mockRejectedValue(err) });
    await user.selectOptions(screen.getByLabelText(/time slot/i), 'after_lunch');
    await user.type(screen.getByLabelText(/glucose/i), '135');
    await user.click(screen.getByRole('button', { name: /add reading/i }));
    expect(await screen.findByText(/already have an After lunch reading/)).toBeInTheDocument();
  });

  test('slots that are already logged are disabled', () => {
    setup({ takenSlots: ['after_lunch'] });
    expect(screen.getByRole('option', { name: /after lunch \(logged\)/i })).toBeDisabled();
  });
});
