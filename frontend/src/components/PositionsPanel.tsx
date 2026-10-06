/* ── PositionsPanel — live portfolio holdings ── */
import type { HoldingData } from '../types';
import './PositionsPanel.css';

interface Props {
  holdings: HoldingData[];
  onClose?: undefined;
}

export default function PositionsPanel({ holdings }: Props) {
  const open = holdings.filter((h) => h.quantity > 0);

  return (
    <div className="positions">
      <table className="data-table">
        <thead>
          <tr>
            <th>Instrument</th>
            <th className="num">Qty</th>
            <th className="num">Avg Cost</th>
            <th className="num">Last</th>
            <th className="num">Mkt Value</th>
            <th className="num">Unreal. P&L</th>
            <th className="num">%</th>
          </tr>
        </thead>
        <tbody>
          {open.length === 0 ? (
            <tr>
              <td colSpan={7} className="positions-empty">
                No open positions — your first fill will appear here.
              </td>
            </tr>
          ) : (
            open.map((h) => {
              const up = h.unrealized_pl >= 0;
              return (
                <tr key={h.ticker}>
                  <td>
                    <span className="pos-ticker mono">{h.ticker}</span>
                    <span className="pos-name">{h.company_name}</span>
                  </td>
                  <td className="mono num">{h.quantity}</td>
                  <td className="mono num">{h.average_cost.toFixed(2)}</td>
                  <td className="mono num">{h.current_price.toFixed(2)}</td>
                  <td className="mono num">₡{h.market_value.toFixed(2)}</td>
                  <td className={`mono num ${up ? 'price-up' : 'price-down'}`}>
                    {up ? '+' : ''}₡{h.unrealized_pl.toFixed(2)}
                  </td>
                  <td className={`mono num ${up ? 'price-up' : 'price-down'}`}>
                    {up ? '+' : ''}{h.unrealized_pl_percent.toFixed(2)}%
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
