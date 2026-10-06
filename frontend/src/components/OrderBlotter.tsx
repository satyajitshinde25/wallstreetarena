/* ── OrderBlotter — live order history / executions ── */
import type { OrderResponse } from '../types';
import './OrderBlotter.css';

interface Props {
  orders: OrderResponse[];
  maxTrades: number;
}

export default function OrderBlotter({ orders, maxTrades }: Props) {
  const filled = orders.filter((o) => o.status === 'FILLED').length;

  const statusClass = (status: string) => {
    switch (status) {
      case 'FILLED': return 'badge-green';
      case 'PENDING': return 'badge-yellow';
      case 'REJECTED':
      case 'EXPIRED': return 'badge-red';
      default: return 'badge-blue';
    }
  };

  return (
    <div className="blotter">
      <table className="data-table">
        <thead>
          <tr>
            <th>Tick</th>
            <th>Side</th>
            <th>Sym</th>
            <th className="num">Qty</th>
            <th className="num">Fill ₡</th>
            <th className="num">Fee</th>
            <th className="num">Net</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {orders.length === 0 ? (
            <tr>
              <td colSpan={8} className="blotter-empty">
                No orders routed yet — {maxTrades} trades available.
              </td>
            </tr>
          ) : (
            orders.slice(0, 50).map((o) => (
              <tr key={o.order_id}>
                <td className="mono blotter-tick">
                  {o.submitted_tick}
                  {o.fill_tick != null && o.fill_tick !== o.submitted_tick ? (
                    <span className="tick-arrow"> → {o.fill_tick}</span>
                  ) : null}
                </td>
                <td>
                  <span className={`blotter-side ${o.side === 'BUY' ? 'side-buy' : 'side-sell'}`}>
                    {o.side}
                  </span>
                </td>
                <td className="mono blotter-sym">{o.ticker}</td>
                <td className="mono num">{o.quantity}</td>
                <td className="mono num">
                  {o.status === 'PENDING'
                    ? <span className="pending-label">next tick</span>
                    : o.fill_price != null ? o.fill_price.toFixed(2) : '—'}
                </td>
                <td className="mono num blotter-fee">{o.fee.toFixed(2)}</td>
                <td className="mono num">{o.net_value != null ? o.net_value.toFixed(2) : '—'}</td>
                <td><span className={`badge ${statusClass(o.status)}`}>{o.status}</span></td>
              </tr>
            ))
          )}
        </tbody>
      </table>
      {orders.length > 0 && (
        <div className="blotter-foot mono">
          FILLED {filled} / {maxTrades} TRADES · SHOWING {Math.min(orders.length, 50)} OF {orders.length}
        </div>
      )}
    </div>
  );
}
