/* ── ChartStage — presentation wrapper for the chart centerpiece ──
   Renders the instrument ident, style toggle and the TerminalChart.
   No state, no fetching: everything arrives via props from Dashboard. */
import type { CandleData, CompanyPrice } from '../types';
import TerminalChart, { type ChartStyle } from './TerminalChart';

interface Props {
  stock: CompanyPrice | null;
  chartStyle: ChartStyle;
  onStyleChange: (style: ChartStyle) => void;
  candles: Record<string, CandleData[]>;
}

export default function ChartStage({ stock, chartStyle, onStyleChange, candles }: Props) {
  return (
    <>
      <div className="panel-head chart-head">
        <div className="chart-head-ident">
          <h2 className="mono">{stock?.ticker ?? '—'}</h2>
          <span className="chart-head-name">{stock?.name}</span>
          {stock && (
            <span
              key={stock.price}
              className={`chart-head-price mono ${stock.change >= 0 ? 'price-up' : 'price-down'}`}
            >
              ₡{stock.price.toFixed(2)}
              <em className={stock.change >= 0 ? 'price-up' : 'price-down'}>
                {stock.change >= 0 ? '▲' : '▼'} {Math.abs(stock.change_percent).toFixed(2)}%
              </em>
            </span>
          )}
        </div>
        <div className="chart-style-toggle" role="group" aria-label="Chart style">
          <button
            type="button"
            className={`cst-btn ${chartStyle === 'candles' ? 'active' : ''}`}
            onClick={() => onStyleChange('candles')}
          >
            CANDLES
          </button>
          <button
            type="button"
            className={`cst-btn ${chartStyle === 'area' ? 'active' : ''}`}
            onClick={() => onStyleChange('area')}
          >
            LINE
          </button>
        </div>
      </div>
      <div className="chart-body">
        {stock && (
          <TerminalChart
            ticker={stock.ticker}
            candles={candles[stock.ticker] ?? []}
            style={chartStyle}
            livePrice={stock.price}
          />
        )}
      </div>
    </>
  );
}
