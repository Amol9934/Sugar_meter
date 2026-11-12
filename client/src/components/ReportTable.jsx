import { formatRange } from '../lib/dates.js';

/** rows: [{ key, title, range, stats, emptyHint }]. One table so the three periods compare at a glance. */
export default function ReportTable({ rows }) {
  return (
    <section className="numbers" aria-labelledby="numbers-title">
      <h2 id="numbers-title">Your numbers</h2>
      <p className="numbers-unit">Glucose in mg/dl</p>
      <table>
        <thead>
          <tr>
            <th scope="col">Period</th>
            <th scope="col">Highest</th>
            <th scope="col">Lowest</th>
            <th scope="col">Average</th>
            <th scope="col">Readings</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ key, title, range, stats, emptyHint }) => (
            <tr key={key} className={stats.count === 0 ? 'is-empty' : undefined}>
              <th scope="row">
                <span className="period">{title}</span>
                <span className="range">{formatRange(range)}</span>
              </th>
              {stats.count === 0 ? (
                <td colSpan={4} className="empty">{emptyHint}</td>
              ) : (
                <>
                  <td data-label="Highest">{stats.highest}</td>
                  <td data-label="Lowest">{stats.lowest}</td>
                  <td data-label="Average">{stats.average.toFixed(1)}</td>
                  <td data-label="Readings">{stats.count}</td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

export function NumbersSkeleton() {
  return (
    <section className="numbers" aria-busy="true" aria-label="Loading your numbers">
      <h2>Your numbers</h2>
      <div className="skeleton" /><div className="skeleton" /><div className="skeleton" />
    </section>
  );
}
