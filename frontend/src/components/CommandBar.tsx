/* ── CommandBar — premium header for the trading arena ──
   Presentation only: every value arrives as a prop from Dashboard,
   which owns all state, polling and WebSocket logic. */
import type { GameState, Portfolio } from '../types';

interface Props {
  gameState: GameState;
  portfolio: Portfolio | null;
  simTime: string;
  countdown: number;
  tickPulse: number;
  drawerOpen: boolean;
  onToggleDrawer: () => void;
  holdingsCount: number;
  ordersCount: number;
  hasError: boolean;
  isReconnecting: boolean;
  displayName: string;
  teamCode: string;
  onLogout: () => void;
}

export default function CommandBar({
  gameState, portfolio, simTime, countdown, tickPulse,
  drawerOpen, onToggleDrawer, holdingsCount, ordersCount, hasError,
  isReconnecting, displayName, teamCode, onLogout,
}: Props) {
  const gameRunning = gameState.status === 'RUNNING';
  const statusClass =
    gameState.status === 'RUNNING' ? 'badge-green'
    : gameState.status === 'FINISHED' ? 'badge-red'
    : 'badge-yellow';

  return (
    <header className="cmd-bar">
      <div className="cmd-left">
        <div className="cmd-logo">
          <svg width="22" height="22" viewBox="0 0 48 48" fill="none" aria-hidden="true">
            <path d="M6 36 L12 26 L18 30 L26 16 L32 22 L42 10" stroke="#e8c558" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            <rect x="20" y="26" width="4" height="14" rx="1" fill="#e8c558" />
          </svg>
          <span className="cmd-title">MARKET SPRINT</span>
        </div>

        <span className={`badge ${statusClass} cmd-status`}>
          <span className={`status-dot ${gameRunning ? 'dot-live' : ''}`} />
          {gameState.status}
        </span>

        <div className="cmd-clock" role="timer" aria-label="Market tick status">
          <span className="cmd-tick mono" key={tickPulse}>
            TICK <b>{String(gameState.current_tick).padStart(2, '0')}/{gameState.max_tick}</b>
          </span>
          <span className="cmd-simtime mono">{simTime}</span>
          {countdown > 0 && gameRunning && (
            <span className="cmd-countdown mono">
              ⏱ {String(Math.floor(countdown / 60)).padStart(2, '0')}:{String(countdown % 60).padStart(2, '0')}
            </span>
          )}
        </div>
      </div>

      {portfolio && (
        <div className="cmd-account">
          <div className="acct-cell">
            <span className="acct-label">EQUITY</span>
            <span key={portfolio.portfolio_value} className="acct-value mono acct-flash">
              ₡{portfolio.portfolio_value.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="acct-cell">
            <span className="acct-label">CASH</span>
            <span className="acct-value mono">₡{portfolio.cash.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </div>
          <div className="acct-cell">
            <span className="acct-label">P&L</span>
            <span className={`acct-value mono ${portfolio.profit_loss >= 0 ? 'price-up' : 'price-down'}`}>
              {portfolio.profit_loss >= 0 ? '+' : ''}₡{portfolio.profit_loss.toFixed(2)}
              <em>({portfolio.profit_loss_percent >= 0 ? '+' : ''}{portfolio.profit_loss_percent.toFixed(2)}%)</em>
            </span>
          </div>
          <div className="acct-cell">
            <span className="acct-label">TRADES</span>
            <span className="acct-value mono">
              {portfolio.trades_used}<em>/{portfolio.max_trades}</em>
            </span>
          </div>
          <div className="acct-cell">
            <span className="acct-label">ELIGIBLE</span>
            <span className={`acct-value ${portfolio.is_eligible ? 'price-up' : 'price-down'}`}>
              {portfolio.is_eligible ? '✓' : '✗'}
            </span>
          </div>
        </div>
      )}

      <div className="cmd-right">
        <button
          type="button"
          className={`btn btn-outline btn-sm drawer-toggle ${drawerOpen ? 'drawer-toggle-open' : ''}`}
          onClick={onToggleDrawer}
          aria-expanded={drawerOpen}
          aria-controls="floor-drawer"
        >
          PORTFOLIO
          <span className="dock-count mono" title="Open positions">{holdingsCount}</span>
          <span className="dock-count mono" title="Orders routed">{ordersCount}</span>
          {hasError && <span className="dock-count dock-count-alert mono">!</span>}
        </button>

        <div className={`conn-pill ${isReconnecting ? 'conn-bad' : 'conn-ok'}`}>
          <span className="conn-dot" />
          {isReconnecting ? 'RECONNECTING' : 'FEED LIVE'}
        </div>

        <div className="cmd-team">
          <span className="cmd-team-name">{displayName}</span>
          <span className="cmd-team-code mono">{teamCode}</span>
        </div>

        <button className="btn btn-outline btn-sm" onClick={onLogout}>Logout</button>
      </div>
    </header>
  );
}
