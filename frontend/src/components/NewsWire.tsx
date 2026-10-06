/* ── NewsWire — Meridia Business Wire: breaking popup + history ──
   Same behavior as before: pops the newest headline when it lands,
   searchable history of released events, upcoming scheduled events. */
import { useState, useMemo, useEffect, useRef } from 'react';
import type { NewsResponse, NewsEvent } from '../types';
import './NewsWire.css';

interface Props {
  news: NewsResponse;
  currentTick: number;
  tickSeconds?: number;
}

export default function NewsWire({ news, currentTick, tickSeconds = 37.5 }: Props) {
  const [searchQuery, setSearchQuery] = useState('');
  const [popupEvent, setPopupEvent] = useState<NewsEvent | null>(null);

  const formatSimulationTime = (tick: number) => {
    const totalSecs = Math.round(tick * tickSeconds);
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const latestEvent = news.released_events.length > 0 ? news.released_events[0] : null;
  const initialLoadRef = useRef(true);
  const lastSeenEventRef = useRef<number>(-1);

  // Breaking-news popup when a new headline crosses the wire
  useEffect(() => {
    if (latestEvent) {
      if (initialLoadRef.current) {
        initialLoadRef.current = false;
        lastSeenEventRef.current = latestEvent.event_number;
      } else if (lastSeenEventRef.current !== latestEvent.event_number) {
        lastSeenEventRef.current = latestEvent.event_number;
        setPopupEvent(latestEvent);
      }
    }
  }, [latestEvent]);

  const filteredHistory = useMemo(() => {
    if (!searchQuery.trim()) return news.released_events;
    const q = searchQuery.toLowerCase();
    return news.released_events.filter(
      (e) =>
        e.headline.toLowerCase().includes(q) ||
        (e.description && e.description.toLowerCase().includes(q)) ||
        (e.calendar_title && e.calendar_title.toLowerCase().includes(q)),
    );
  }, [news.released_events, searchQuery]);

  return (
    <div className="wire-panel">
      {/* ── Breaking news popup ── */}
      {popupEvent && (
        <div className="news-popup-overlay animate-fade-in" onClick={() => setPopupEvent(null)}>
          <div className="news-popup-card" onClick={(e) => e.stopPropagation()}>
            <div className="news-popup-header">
              <div className="news-popup-brand">
                <span className="live-dot" />
                <span className="news-popup-title">BREAKING — MERIDIA WIRE</span>
              </div>
              <button className="btn btn-icon btn-outline" onClick={() => setPopupEvent(null)}>✕</button>
            </div>
            <div className="news-popup-body">
              <div className="news-popup-meta mono">
                <span>TICK {popupEvent.release_tick}</span>
                <span>•</span>
                <span>{formatSimulationTime(popupEvent.release_tick)}</span>
                {popupEvent.calendar_title && (
                  <>
                    <span>•</span>
                    <span className="news-popup-topic">{popupEvent.calendar_title}</span>
                  </>
                )}
              </div>
              <h2 className="news-popup-headline">{popupEvent.headline}</h2>
              {popupEvent.description && <p className="news-popup-desc">{popupEvent.description}</p>}
            </div>
            <div className="news-popup-footer">
              <span className="news-popup-hint mono">The tape is moving — position accordingly.</span>
              <button className="btn btn-primary" onClick={() => setPopupEvent(null)}>
                Back to the floor
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Latest headline banner ── */}
      {latestEvent && (
        <button
          className="wire-latest"
          onClick={() => setPopupEvent(latestEvent)}
          title="Click for full story"
        >
          <span className="wire-latest-flash">⚡ WIRE</span>
          <span className="wire-latest-headline">{latestEvent.headline}</span>
          <span className="wire-latest-meta mono">
            TICK {latestEvent.release_tick} · {formatSimulationTime(latestEvent.release_tick)}
          </span>
        </button>
      )}

      {/* ── Upcoming scheduled ── */}
      {news.upcoming_scheduled.length > 0 && (
        <div className="wire-upcoming">
          <span className="wu-label mono">ON THE CALENDAR</span>
          {news.upcoming_scheduled.slice(0, 3).map((u) => (
            <span key={u.event_number} className="wu-item mono">
              <b>T{u.release_tick}</b> {u.calendar_title || u.headline}
            </span>
          ))}
        </div>
      )}

      {/* ── History ── */}
      <div className="wire-toolbar">
        <input
          className="input input-sm wire-search"
          type="text"
          placeholder="Search headlines…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>
      <div className="wire-history">
        {filteredHistory.length === 0 ? (
          <p className="wire-empty">
            {news.released_events.length === 0
              ? 'Awaiting market-opening headlines. Breaking news crosses the wire live.'
              : 'No headlines match your search.'}
          </p>
        ) : (
          [...filteredHistory].reverse().map((evt) => (
            <button key={evt.event_number} className="wire-item" onClick={() => setPopupEvent(evt)}>
              <div className="wire-item-meta mono">
                <span className="wire-item-tick">TICK {evt.release_tick}</span>
                <span>{formatSimulationTime(evt.release_tick)}</span>
                {evt.calendar_title && <span className="wire-item-topic">{evt.calendar_title}</span>}
                {evt.release_tick === currentTick && <span className="wire-fresh">NEW</span>}
              </div>
              <div className="wire-item-headline">{evt.headline}</div>
              {evt.description && <div className="wire-item-desc">{evt.description}</div>}
            </button>
          ))
        )}
      </div>
    </div>
  );
}
