import { lazy, Suspense, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../AuthContext.jsx';
import { DropMark } from '../components/Icons.jsx';
import { formatDate, formatRange, localToday } from '../lib/dates.js';
import { slotLabel } from '../lib/slots.js';

const TrendChart = lazy(() => import('../components/TrendChart.jsx'));

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatDayLabel(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return `${d} ${MONTHS[m - 1]}`;
}

function formatChange(val) {
  if (val === null || val === undefined) return '-';
  if (val > 0) return `+${val}`;
  return `${val}`;
}

export default function Summary() {
  const { user } = useAuth();
  const today = localToday();
  const [days, setDays] = useState(30);
  const [summary, setSummary] = useState(null);
  const [trend, setTrend] = useState(null);
  const [loading, setLoading] = useState(true);
  const [trendLoading, setTrendLoading] = useState(true);
  const [error, setError] = useState(null);
  const [trendError, setTrendError] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState(null);

  useEffect(() => {
    document.title = 'Visit summary – Sweety';
  }, []);

  useEffect(() => {
    let ignore = false;
    setLoading(true);
    setTrendLoading(true);
    setError(null);
    setTrendError(null);

    api.summary(days)
      .then((data) => {
        if (!ignore) {
          setSummary(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!ignore) {
          setError(err.message);
          setLoading(false);
        }
      });

    api.trend?.(days)
      ?.then((data) => {
        if (!ignore) {
          setTrend(data);
          setTrendLoading(false);
        }
      })
      ?.catch((err) => {
        if (!ignore) {
          setTrendError(err.message);
          setTrendLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [days]);

  async function handleExportCsv() {
    setExporting(true);
    setExportError(null);
    try {
      const range = summary?.range ? { from: summary.range.from, to: summary.range.to } : {};
      await api.downloadCsv(range);
    } catch (err) {
      setExportError(err.message || 'Unable to export CSV. Please try again.');
    } finally {
      setExporting(false);
    }
  }

  const isEmpty = summary && summary.overall.count === 0;

  return (
    <div className="shell summary-page">
      <header className="topbar">
        <div className="brand"><DropMark /> <span>Sweety</span></div>
        <div className="who">
          <Link to="/" className="ghost small">Back to Dashboard</Link>
          <button
            type="button"
            className="ghost small export-btn"
            onClick={handleExportCsv}
            disabled={exporting}
            aria-busy={exporting}
          >
            {exporting ? 'Exporting…' : 'Export CSV'}
          </button>
          <button type="button" className="ghost small print-btn" onClick={() => window.print()}>
            Print / Save as PDF
          </button>
        </div>
      </header>

      <section className="summary-head">
        <div>
          <h1 className="headline">
            {user.name} <span className="period-span">({summary?.range ? formatRange(summary.range) : `${days} days`})</span>
          </h1>
          <p className="subline">Visit summary · Self-recorded blood glucose values</p>
        </div>

        <div className="summary-controls">
          <div className="segmented-control" role="group" aria-label="Select report period">
            {[7, 14, 30, 90].map((d) => (
              <button
                key={d}
                type="button"
                className={`segment-btn ${days === d ? 'active' : ''}`}
                aria-pressed={days === d}
                onClick={() => setDays(d)}
              >
                {d} days
              </button>
            ))}
          </div>
        </div>
      </section>

      {loading && <p className="center-note">Loading visit summary…</p>}
      {error && <p className="center-note form-error">{error}</p>}
      {exportError && <p className="center-note form-error" role="alert">{exportError}</p>}

      {!loading && !error && isEmpty && (
        <section className="summary-sheet empty-summary">
          <p className="center-note" style={{ marginTop: '3rem', marginBottom: '3rem' }}>
            No readings recorded for this period.
          </p>
        </section>
      )}

      {!loading && !error && summary && !isEmpty && (
        <>
          <section className="summary-sheet">
            <p className="summary-completeness">
              Logged on {summary.daysLogged} of {summary.days} days - {summary.completeness}% of readings
            </p>

            <div className="consistency-section">
              <h2 className="consistency-title">Daily logging consistency</h2>
              <div className="consistency-strip" role="group" aria-label="Daily consistency">
                {summary.daily.map((d) => {
                  const label = `${formatDayLabel(d.date)}: ${d.count} of 4 readings`;
                  return (
                    <div
                      key={d.date}
                      className={`strip-square shade-${Math.min(4, Math.max(0, d.count))}`}
                      role="img"
                      aria-label={label}
                      title={label}
                    />
                  );
                })}
              </div>
              <div className="strip-legend" aria-label="Consistency legend">
                <span className="legend-label">0</span>
                <span className="strip-square shade-0" aria-hidden="true" />
                <span className="strip-square shade-1" aria-hidden="true" />
                <span className="strip-square shade-2" aria-hidden="true" />
                <span className="strip-square shade-3" aria-hidden="true" />
                <span className="strip-square shade-4" aria-hidden="true" />
                <span className="legend-label">4 readings/day</span>
              </div>
            </div>

            <table className="summary-table">
              <thead>
                <tr>
                  <th scope="col">Slot</th>
                  <th scope="col">Average</th>
                  <th scope="col">Lowest</th>
                  <th scope="col">Highest</th>
                  <th scope="col">Readings</th>
                  <th scope="col">vs previous {days} days</th>
                </tr>
              </thead>
              <tbody>
                {summary.slots.map((s) => (
                  <tr key={s.slot}>
                    <th scope="row">{slotLabel(s.slot)}</th>
                    <td>{s.count > 0 && s.average !== null ? s.average : '-'}</td>
                    <td>{s.count > 0 && s.lowest !== null ? s.lowest : '-'}</td>
                    <td>{s.count > 0 && s.highest !== null ? s.highest : '-'}</td>
                    <td>{s.count}</td>
                    <td>{formatChange(s.change)}</td>
                  </tr>
                ))}
                <tr className="overall-row">
                  <th scope="row">Overall</th>
                  <td>{summary.overall.count > 0 && summary.overall.average !== null ? summary.overall.average : '-'}</td>
                  <td>{summary.overall.count > 0 && summary.overall.lowest !== null ? summary.overall.lowest : '-'}</td>
                  <td>{summary.overall.count > 0 && summary.overall.highest !== null ? summary.overall.highest : '-'}</td>
                  <td>{summary.overall.count}</td>
                  <td>-</td>
                </tr>
              </tbody>
            </table>
          </section>

          <Suspense fallback={<div className="trend-card"><p className="center-note">Loading trend…</p></div>}>
            <TrendChart trend={trend} loading={trendLoading} error={trendError} />
          </Suspense>
        </>
      )}

      <footer className="summary-footer">
        <p className="disclaimer">Self-recorded values. This summary is not a diagnosis or medical advice.</p>
        <p className="generated-on">Generated on {formatDate(today)}</p>
      </footer>
    </div>
  );
}

