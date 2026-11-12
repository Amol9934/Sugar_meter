// Instant feedback only. The API re-validates everything and its message is shown if it disagrees.
export function validateReading({ value, date }, today) {
  if (value === '' || value === null || value === undefined || String(value).trim() === '') {
    return { field: 'value', message: 'Please enter a glucose value.' };
  }
  const n = Number(value);
  if (!/^\d+$/.test(String(value).trim()) || n < 40 || n > 600) {
    return { field: 'value', message: 'Value must be between 40 and 600 mg/dl.' };
  }
  if (date > today) return { field: 'date', message: 'Date cannot be in the future.' };
  return null;
}
