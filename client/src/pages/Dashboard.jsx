import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../AuthContext.jsx';
import { addDays, formatLong, greeting, localToday } from '../lib/dates.js';
import { slotLabel, SLOTS } from '../lib/slots.js';
import Logbook from '../components/Logbook.jsx';
import ReadingForm from '../components/ReadingForm.jsx';
import ReportTable, { NumbersSkeleton } from '../components/ReportTable.jsx';
import { DropMark, ChevronLeft, ChevronRight } from '../components/Icons.jsx';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const today = localToday();
  const [date, setDate] = useState(today);
  const [report, setReport] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [editing, setEditing] = useState(null);
  const [presetSlot, setPresetSlot] = useState('');
  const [notice, setNotice] = useState(null);
  const noticeTimer = useRef();

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      setReport(await api.report(date));
    } catch (err) {
      if (err.status === 401) return logout(); // session expired
      setLoadError(err.message);
    }
  }, [date, logout]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => () => clearTimeout(noticeTimer.current), []);

  function flash(message) {
    setNotice(message);
    clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(null), 3500);
  }

  // Changing the day cancels any edit in progress, since an edit belongs to one day.
  function changeDate(next) {
    if (!next || next > today) return;
    setDate(next);
    setEditing(null);
    setPresetSlot('');
  }

  async function save(payload) {
    const wasEditing = Boolean(editing);
    if (editing) await api.updateReading(editing.id, payload);
    else await api.createReading(payload);
    setEditing(null);
    setPresetSlot('');
    await load();
    flash(`${slotLabel(payload.slot)}: ${payload.value} mg/dl ${wasEditing ? 'updated' : 'saved'}`);
  }

  async function remove(r) {
    try {
      await api.deleteReading(r.id);
      if (editing?.id === r.id) setEditing(null);
      await load();
      flash(`${slotLabel(r.slot)} reading deleted`);
    } catch (err) {
      setLoadError(err.message);
    }
  }

  const isToday = date === today;
  const readings = report?.daily.readings ?? [];
  const takenSlots = readings.filter((r) => r.id !== editing?.id).map((r) => r.slot);
  const firstName = user.name.split(' ')[0];
  const logged = readings.length;

  return (
    <div className="shell">
      <header className="topbar">
        <div className="brand"><DropMark /> <span>Sweety</span></div>
        <div className="who">
          <span className="who-name">{user.name}</span>
          <button className="ghost small" onClick={logout}>Log out</button>
        </div>
      </header>

      <section className="daybar">
        <div>
          <h1 className="headline">{isToday ? `${greeting(new Date().getHours())}, ${firstName}` : formatLong(date)}</h1>
          <p className="subline">{isToday ? formatLong(date) : 'You are viewing a past day.'}</p>
        </div>
        <div className="daynav">
          <button className="icon-btn" onClick={() => changeDate(addDays(date, -1))} aria-label="Previous day"><ChevronLeft /></button>
          <input type="date" value={date} max={today} aria-label="Selected date" onChange={(e) => changeDate(e.target.value)} />
          <button className="icon-btn" onClick={() => changeDate(addDays(date, 1))} disabled={isToday} aria-label="Next day"><ChevronRight /></button>
          {!isToday && <button className="ghost small" onClick={() => changeDate(today)}>Today</button>}
        </div>
      </section>

      <main className="layout">
        <section className="sheet" aria-label="Daily log">
          <div className="sheet-head">
            <h2>Daily log</h2>
            <div className="progress" role="img" aria-label={`${logged} of ${SLOTS.length} readings logged`}>
              <span className="segments">
                {SLOTS.map((s, i) => <i key={s.key} className={i < logged ? 'on' : ''} />)}
              </span>
              <span className="progress-text">{logged === SLOTS.length ? 'All four logged' : `${logged} of ${SLOTS.length} logged`}</span>
            </div>
          </div>
          {loadError && <p role="alert" className="form-error">{loadError}</p>}
          <Logbook
            readings={readings}
            activeSlot={editing?.slot ?? presetSlot}
            onAdd={(slot) => { setEditing(null); setPresetSlot(slot); }}
            onEdit={(r) => { setEditing(r); setPresetSlot(''); }}
            onDelete={remove}
          />
          <ReadingForm
            date={date}
            today={today}
            editing={editing}
            presetSlot={presetSlot}
            takenSlots={takenSlots}
            onSubmit={save}
            onCancel={() => setEditing(null)}
          />
        </section>

        {report ? (
          <ReportTable rows={[
            { key: 'd', title: 'Daily', range: report.daily.range, stats: report.daily.stats, emptyHint: 'Nothing logged this day yet.' },
            { key: 'm', title: 'Month to date', range: report.monthToDate.range, stats: report.monthToDate.stats, emptyHint: 'Nothing logged so far this month.' },
            { key: 'p', title: 'Previous month', range: report.previousMonth.range, stats: report.previousMonth.stats, emptyHint: 'No readings were logged last month.' },
          ]} />
        ) : (
          !loadError && <NumbersSkeleton />
        )}
      </main>

      <div className="toast-region" role="status" aria-live="polite">
        {notice && <p className="toast">{notice}</p>}
      </div>
    </div>
  );
}
