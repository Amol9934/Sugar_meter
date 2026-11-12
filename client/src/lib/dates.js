const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** The user's local calendar date as YYYY-MM-DD (not UTC, which can be yesterday/tomorrow). */
export function localToday(now = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`;
}

const parts = (iso) => iso.split('-').map(Number);

export function formatDate(iso) {
  const [y, m, d] = parts(iso);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

/** "15 Oct 2026" for one day, "1 Oct – 15 Oct 2026" for a range (year shown once if shared). */
export function formatRange({ from, to }) {
  if (from === to) return formatDate(to);
  const [fy, fm, fd] = parts(from);
  const [ty] = parts(to);
  const start = fy === ty ? `${fd} ${MONTHS[fm - 1]}` : formatDate(from);
  return `${start} – ${formatDate(to)}`;
}

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const LONG_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August',
  'September', 'October', 'November', 'December'];

/** Calendar arithmetic in UTC so daylight-saving shifts can never move a date. */
export function addDays(iso, n) {
  const [y, m, d] = parts(iso);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

/** "Thursday, 12 November 2026" */
export function formatLong(iso) {
  const [y, m, d] = parts(iso);
  const weekday = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return `${WEEKDAYS[weekday]}, ${d} ${LONG_MONTHS[m - 1]} ${y}`;
}

export function greeting(hour) {
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}
