/* ── TickerTape — live scrolling market strip + Meridia Wire headlines ──
   Content is entirely derived from server market data and released news. */
import type { CompanyPrice, NewsEvent, UpcomingEvent } from '../types';
import './TickerTape.css';

interface Props {
  prices: CompanyPrice[];
  latestNews: NewsEvent | null;
  upcoming: UpcomingEvent[];
}

export default function TickerTape({ prices, latestNews, upcoming }: Props) {
  const quotes = prices.map((p) => {
    const up = p.change >= 0;
    return (
      <span key={`q-${p.ticker}`} className="tt-quote mono">
        <b className={up ? 'price-up' : 'price-down'}>{p.ticker}</b>
        <span className="tt-price">{p.price.toFixed(2)}</span>
        <span className={`tt-chg ${up ? 'price-up' : 'price-down'}`}>
          {up ? '▲' : '▼'} {Math.abs(p.change_percent).toFixed(2)}%
        </span>
      </span>
    );
  });

  const headlines: React.ReactNode[] = [];
  if (latestNews) {
    headlines.push(
      <span key="news-latest" className="tt-news">
        <span className="tt-flash">⚡ MERIDIA WIRE</span>
        <em>{latestNews.headline}</em>
      </span>,
    );
  }
  upcoming.slice(0, 3).forEach((u) => {
    headlines.push(
      <span key={`up-${u.event_number}`} className="tt-news">
        <span className="tt-cal">◈ {u.calendar_title || 'SCHEDULED'}</span>
        <em>Tick {u.release_tick}: {u.headline}</em>
      </span>,
    );
  });

  // Duplicate the sequence so the CSS loop (-50%) is seamless
  const sequence = [...quotes, ...headlines];

  return (
    <div className="ticker-tape">
      <div className="tt-label">
        <span className="tt-live-dot" />
        LIVE
      </div>
      <div className="tt-viewport">
        <div className="tt-track" key={sequence.length + '-' + (latestNews?.event_number ?? 0)}>
          {sequence.map((el, i) => (
            <span className="tt-item" key={i}>{el}</span>
          ))}
          {sequence.map((el, i) => (
            <span className="tt-item" key={`dup-${i}`} aria-hidden>{el}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
