/* ── Watchlist — live market strip (server data only) ── */
import type { CompanyPrice, CandleData } from '../types';
import './Watchlist.css';

interface Props {
  prices: CompanyPrice[];
  candles: Record<string, CandleData[]>;
  selected: string | null;
  onSelect: (ticker: string) => void;
  lastDirection: Record<string, 'up' | 'down'>;
}

function Sparkline({ points, up }: { points: number[]; up: boolean }) {
  if (points.length < 2) {
    return <div className="wl-spark wl-spark-empty" />;
  }
  const w = 76;
  const h = 26;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const step = (w - 2) / (points.length - 1);
  const d = points
    .map((p, i) => `${(1 + i * step).toFixed(1)},${(h - 2 - ((p - min) / range) * (h - 4)).toFixed(1)}`)
    .join(' ');

  return (
    <svg className="wl-spark" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      <polyline
        points={d}
        fill="none"
        stroke={up ? 'var(--green)' : 'var(--red)'}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function Watchlist({ prices, candles, selected, onSelect, lastDirection }: Props) {
  return (
    <div className="watchlist">
      {prices.map((p) => {
        const up = p.change >= 0;
        const dir = lastDirection[p.ticker];
        const cls = dir === 'up' ? 'wl-row flash-up' : dir === 'down' ? 'wl-row flash-down' : 'wl-row';
        const closeSeries = (candles[p.ticker] || []).map((c) => c.close);
        // Re-keying the quote cell on price change retriggers the flash animation
        const animKey = `${p.ticker}-${dir ?? 'flat'}-${p.price}`;

        return (
          <button
            key={p.ticker}
            className={`${cls} ${selected === p.ticker ? 'wl-row-selected' : ''}`}
            onClick={() => onSelect(p.ticker)}
          >
            <div className="wl-ident">
              <span className="wl-ticker mono">{p.ticker}</span>
              <span className="wl-name">{p.name}</span>
            </div>
            <Sparkline points={closeSeries} up={up} />
            <div className="wl-quote">
              <span className={`wl-price mono ${up ? 'price-up' : 'price-down'}`}>
                {p.price.toFixed(2)}
              </span>
              <span key={animKey} className={`wl-change mono ${up ? 'price-up' : 'price-down'}`}>
                {up ? '▲' : '▼'} {Math.abs(p.change_percent).toFixed(2)}%
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
