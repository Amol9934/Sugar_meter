import {
  CHART_SLOTS,
  calculateYBounds,
  getGridLines,
  createScales,
  buildSegments,
  getXAxisTicks,
} from '../lib/chart.js';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatTick(iso) {
  if (!iso) return '';
  const [, m, d] = iso.split('-').map(Number);
  return `${d} ${MONTHS[m - 1]}`;
}

export default function TrendChart({ trend, loading, error }) {
  if (loading) {
    return (
      <div className="trend-card" aria-busy="true">
        <h2 className="trend-title">Glucose trend</h2>
        <p className="center-note" style={{ margin: '3rem 0' }}>Loading trend…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="trend-card">
        <h2 className="trend-title">Glucose trend</h2>
        <p className="center-note form-error" style={{ margin: '2rem 0' }}>{error}</p>
      </div>
    );
  }

  const points = trend?.points ?? [];
  const range = trend?.range ?? { from: '', to: '' };
  const days = trend?.days ?? points.length;

  // Chart dimensions
  const width = 740;
  const height = 320;
  const padding = { top: 30, right: 30, bottom: 45, left: 55 };

  const { minY, maxY } = calculateYBounds(points);
  const gridLines = getGridLines(minY, maxY, 50);
  const { scaleX, scaleY, plotWidth } = createScales({
    totalPoints: points.length,
    minY,
    maxY,
    width,
    height,
    padding,
  });

  const xTicks = getXAxisTicks(points, days > 30 ? 14 : 7);

  // Build segments and markers for each slot
  const slotSeries = CHART_SLOTS.map((slot) => {
    const segments = buildSegments(points, slot.key, { scaleX, scaleY });
    return { ...slot, segments };
  });

  const rangeSummary = `Glucose trend from ${range.from} to ${range.to} over ${days} days`;

  return (
    <section className="trend-card" aria-labelledby="trend-heading">
      <div className="trend-header">
        <h2 id="trend-heading" className="trend-title">Glucose trend</h2>
        <div className="trend-legend" aria-label="Chart legend">
          {CHART_SLOTS.map((slot) => (
            <div key={slot.key} className="trend-legend-item">
              <svg width="14" height="14" aria-hidden="true" viewBox="0 0 14 14" className="legend-symbol">
                {slot.shape === 'circle' && <circle cx="7" cy="7" r="4.5" fill={slot.color} />}
                {slot.shape === 'square' && <rect x="3" y="3" width="8" height="8" fill={slot.color} />}
                {slot.shape === 'triangle' && <polygon points="7,2 2.5,11.5 11.5,11.5" fill={slot.color} />}
                {slot.shape === 'diamond' && <polygon points="7,2 12,7 7,12 2,7" fill={slot.color} />}
              </svg>
              <span>{slot.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="trend-svg-container">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          width="100%"
          height="auto"
          role="img"
          aria-label={rangeSummary}
          className="trend-svg"
        >
          {/* Y Axis Gridlines and Labels */}
          <g className="grid-y" aria-hidden="true">
            {gridLines.map((yVal) => {
              const y = scaleY(yVal);
              return (
                <g key={yVal} className="grid-line-group">
                  <line
                    x1={padding.left}
                    y1={y}
                    x2={width - padding.right}
                    y2={y}
                    stroke="var(--line)"
                    strokeDasharray="3 3"
                    strokeWidth="1"
                  />
                  <text
                    x={padding.left - 10}
                    y={y + 4}
                    textAnchor="end"
                    fill="var(--muted)"
                    fontSize="11"
                    fontFamily="inherit"
                  >
                    {yVal}
                  </text>
                </g>
              );
            })}
          </g>

          {/* X Axis Ticks and Labels */}
          <g className="grid-x" aria-hidden="true">
            {xTicks.map((tick) => {
              const x = scaleX(tick.index);
              return (
                <g key={tick.date} className="tick-group">
                  <line
                    x1={x}
                    y1={height - padding.bottom}
                    x2={x}
                    y2={height - padding.bottom + 6}
                    stroke="var(--muted)"
                    strokeWidth="1"
                  />
                  <text
                    x={x}
                    y={height - padding.bottom + 20}
                    textAnchor="middle"
                    fill="var(--muted)"
                    fontSize="11"
                    fontFamily="inherit"
                  >
                    {formatTick(tick.date)}
                  </text>
                </g>
              );
            })}
            <line
              x1={padding.left}
              y1={height - padding.bottom}
              x2={width - padding.right}
              y2={height - padding.bottom}
              stroke="var(--line)"
              strokeWidth="1.5"
            />
          </g>

          {/* Slot Polylines & Markers */}
          {slotSeries.map((series) => (
            <g key={series.key} className={`slot-series slot-${series.key}`} aria-hidden="true">
              {series.segments.map((seg, sIdx) => {
                const pointsStr = seg.map((p) => `${p.x},${p.y}`).join(' ');
                return (
                  <polyline
                    key={sIdx}
                    points={pointsStr}
                    fill="none"
                    stroke={series.color}
                    strokeWidth="2.5"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                );
              })}

              {series.segments.flatMap((seg) =>
                seg.map((pt) => {
                  const key = `${series.key}-${pt.date}`;
                  if (series.shape === 'circle') {
                    return (
                      <circle
                        key={key}
                        cx={pt.x}
                        cy={pt.y}
                        r="4"
                        fill={series.color}
                        stroke="var(--sheet)"
                        strokeWidth="1.5"
                      />
                    );
                  }
                  if (series.shape === 'square') {
                    return (
                      <rect
                        key={key}
                        x={pt.x - 3.5}
                        y={pt.y - 3.5}
                        width="7"
                        height="7"
                        fill={series.color}
                        stroke="var(--sheet)"
                        strokeWidth="1.5"
                      />
                    );
                  }
                  if (series.shape === 'triangle') {
                    return (
                      <polygon
                        key={key}
                        points={`${pt.x},${pt.y - 4.5} ${pt.x - 4},${pt.y + 3.5} ${pt.x + 4},${pt.y + 3.5}`}
                        fill={series.color}
                        stroke="var(--sheet)"
                        strokeWidth="1.5"
                      />
                    );
                  }
                  return (
                    <polygon
                      key={key}
                      points={`${pt.x},${pt.y - 4.5} ${pt.x + 4},${pt.y} ${pt.x},${pt.y + 4.5} ${pt.x - 4},${pt.y}`}
                      fill={series.color}
                      stroke="var(--sheet)"
                      strokeWidth="1.5"
                    />
                  );
                })
              )}
            </g>
          ))}
        </svg>
      </div>

      {/* Accessible visually-hidden table fallback */}
      <div className="visually-hidden">
        <table>
          <caption>{rangeSummary}</caption>
          <thead>
            <tr>
              <th scope="col">Date</th>
              {CHART_SLOTS.map((s) => (
                <th key={s.key} scope="col">{s.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {points.map((pt) => (
              <tr key={pt.date}>
                <th scope="row">{pt.date}</th>
                {CHART_SLOTS.map((s) => (
                  <td key={s.key}>
                    {pt[s.key] !== null ? `${pt[s.key]} mg/dl` : 'No reading'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

