/* ── FloorDrawer — slide-out records panel (Positions / Orders / Wire / Errors) ──
   Presentation only. The open/close state, Escape handling and focus
   management live in Dashboard; this component receives callbacks.
   Accessibility contract preserved: role=dialog, aria-hidden, inert when
   closed (hidden content is not keyboard-focusable), backdrop click closes. */
import type { RefObject } from 'react';
import type { GameState, NewsResponse, OrderResponse, Portfolio } from '../types';
import PositionsPanel from './PositionsPanel';
import OrderBlotter from './OrderBlotter';
import NewsWire from './NewsWire';
import ErrorReviewCard from './ErrorReviewCard';

export type FloorTab = 'positions' | 'blotter' | 'wire' | 'errors';

interface Props {
  open: boolean;
  onClose: () => void;
  tab: FloorTab;
  onTab: (tab: FloorTab) => void;
  portfolio: Portfolio | null;
  orders: OrderResponse[];
  news: NewsResponse | null;
  lastError: { order: string; message: string; tick: number } | null;
  gameState: GameState;
  closeRef: RefObject<HTMLButtonElement | null>;
  onClearError: () => void;
}

export default function FloorDrawer({
  open, onClose, tab, onTab, portfolio, orders, news, lastError, gameState, closeRef, onClearError,
}: Props) {
  const holdingsCount = portfolio?.holdings.filter((h) => h.quantity > 0).length ?? 0;

  return (
    <>
      <div
        className={`drawer-backdrop ${open ? 'open' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        id="floor-drawer"
        className={`floor-drawer ${open ? 'open' : ''}`}
        role="dialog"
        aria-label="Positions, orders and Meridia Wire"
        aria-hidden={!open}
        inert={!open}
      >
        <div className="drawer-head">
          <h2>FLOOR RECORDS</h2>
          <button
            ref={closeRef}
            type="button"
            className="btn btn-ghost btn-sm drawer-close"
            onClick={onClose}
          >
            ✕ ESC
          </button>
        </div>

        <div className="dock-tabs">
          <button
            className={`dock-tab ${tab === 'positions' ? 'active' : ''}`}
            onClick={() => onTab('positions')}
          >
            POSITIONS <span className="dock-count mono">{holdingsCount}</span>
          </button>
          <button
            className={`dock-tab ${tab === 'blotter' ? 'active' : ''}`}
            onClick={() => onTab('blotter')}
          >
            ORDERS <span className="dock-count mono">{orders.length}</span>
          </button>
          <button
            className={`dock-tab ${tab === 'wire' ? 'active' : ''}`}
            onClick={() => onTab('wire')}
          >
            MERIDIA WIRE <span className="dock-count mono">{news?.released_events.length ?? 0}</span>
            {(news?.released_events.length ?? 0) > 0 && <span className="dock-live-dot" />}
          </button>
          {lastError && (
            <button
              className={`dock-tab dock-tab-alert ${tab === 'errors' ? 'active' : ''}`}
              onClick={() => onTab('errors')}
            >
              ERRORS <span className="dock-count dock-count-alert mono">!</span>
            </button>
          )}
          <div className="dock-spacer" />
          {tab !== 'wire' && portfolio && (
            <span className="dock-legend mono">
              {tab === 'positions'
                ? <>HOLDINGS ₡{portfolio.holdings_value.toFixed(2)}</>
                : <>FILLED {orders.filter((o) => o.status === 'FILLED').length}/{gameState.max_trades}</>}
            </span>
          )}
        </div>

        <div className="dock-body">
          {tab === 'positions' && portfolio && (
            <PositionsPanel holdings={portfolio.holdings} />
          )}
          {tab === 'blotter' && (
            <OrderBlotter orders={orders} maxTrades={gameState.max_trades} />
          )}
          {tab === 'wire' && news && (
            <NewsWire news={news} currentTick={gameState.current_tick} tickSeconds={gameState.tick_seconds} />
          )}
          {tab === 'errors' && lastError && (
            <ErrorReviewCard error={lastError} maxTick={gameState.max_tick} onClear={onClearError} />
          )}
        </div>
      </aside>
    </>
  );
}
