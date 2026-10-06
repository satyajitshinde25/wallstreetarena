/* ── Admin Command Deck — THE WOLF OF WALL STREET theme ──
   All game-control logic, endpoints and polling behavior unchanged. */
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  adminGetGame, adminStartGame, adminRestartGame,
  adminGetLeaderboard, adminGetOrders, adminGetAudit, logout,
  adminPauseGame, adminResumeGame, adminToggleTestMode,
  adminGetNewsScript, adminFireReserveHeadline, adminGetCandidateHeadlines,
} from '../api/client';
import type { LeaderboardEntry } from '../types';
import './AdminDashboard.css';

type AdminTab = 'leaderboard' | 'orders' | 'audit' | 'news' | 'generator';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [game, setGame] = useState<any>(null);
  const [leaderboard, setLeaderboard] = useState<{ tick: number; entries: LeaderboardEntry[] } | null>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [audit, setAudit] = useState<any[]>([]);
  const [newsScript, setNewsScript] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<AdminTab>('leaderboard');
  const [candidates, setCandidates] = useState<any[]>([]);
  const [candidateCat, setCandidateCat] = useState<string>('all');
  const [candidateLoading, setCandidateLoading] = useState<boolean>(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [countdown, setCountdown] = useState<number>(0);
  const [confirmRestart, setConfirmRestart] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [g, lb, od, au, ns] = await Promise.all([
        adminGetGame(), adminGetLeaderboard(),
        adminGetOrders(), adminGetAudit(), adminGetNewsScript(),
      ]);
      setGame(g);
      setLeaderboard(lb.leaderboard ?? lb);
      setOrders(od.orders || []);
      setAudit(au.logs || []);
      setNewsScript(ns.events || []);
    } catch (err) {
      console.error('Admin fetch error:', err);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const id = setInterval(fetchData, 5000);
    return () => clearInterval(id);
  }, [fetchData]);

  useEffect(() => {
    if (!game?.game?.next_tick_at && !game?.next_tick_at) return;
    const nextAt = game.game?.next_tick_at ?? game.next_tick_at;
    const tick = () => {
      const remaining = Math.max(0, Math.floor((new Date(nextAt).getTime() - Date.now()) / 1000));
      setCountdown(remaining);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [game?.game?.next_tick_at, game?.next_tick_at]);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleStart = async () => {
    try { await adminStartGame(); showToast('Game started!', 'success'); fetchData(); }
    catch (err: any) { showToast(err.message, 'error'); }
  };

  const handleRestart = async () => {
    try { await adminRestartGame(); showToast('Game restarted! All teams reset to starting balance.', 'success'); setConfirmRestart(false); fetchData(); }
    catch (err: any) { showToast(err.message, 'error'); }
  };

  const handlePause = async () => {
    try { await adminPauseGame(); showToast('Game paused', 'success'); fetchData(); }
    catch (err: any) { showToast(err.message, 'error'); }
  };

  const handleResume = async () => {
    try { await adminResumeGame(); showToast('Game resumed', 'success'); fetchData(); }
    catch (err: any) { showToast(err.message, 'error'); }
  };

  const handleToggleTestMode = async () => {
    try { await adminToggleTestMode(); showToast('Test mode toggled', 'success'); fetchData(); }
    catch (err: any) { showToast(err.message, 'error'); }
  };

  const handleFireReserve = async (id: string) => {
    try { await adminFireReserveHeadline(id); showToast('Reserve fired!', 'success'); fetchData(); }
    catch (err: any) { showToast(err.message, 'error'); }
  };

  const loadCandidates = async (cat: string) => {
    setCandidateLoading(true);
    setCandidateCat(cat);
    try {
      const res = await adminGetCandidateHeadlines(cat);
      setCandidates(res.candidates || []);
    } catch (err: any) {
      showToast(err.message || 'Failed to load candidates', 'error');
    } finally {
      setCandidateLoading(false);
    }
  };

  const handleLogout = async () => {
    try { await logout(); } catch (_) {}
    localStorage.clear();
    navigate('/');
  };

  if (!game) {
    return (
      <div className="admin-loading">
        <div className="loading-spinner" style={{ width: 34, height: 34 }} />
        <p className="mono">OPENING COMMAND DECK…</p>
      </div>
    );
  }

  // Admin endpoint returns { game, teams, leaderboard }
  const g = game.game ?? game;
  const statusClass =
    g.status === 'RUNNING' ? 'badge-green'
    : g.status === 'FINISHED' ? 'badge-red'
    : 'badge-yellow';

  return (
    <div className="admin-dashboard">
      {/* ── Header ── */}
      <header className="admin-header">
        <div className="admin-header-left">
          <h1 className="admin-title">COMMAND DECK</h1>
          <span className={`badge ${statusClass}`}>
            <span className="status-dot" style={{ background: 'currentColor' }} />
            {g.status}
          </span>
          <span className="mono admin-tick">
            TICK <b>{String(g.current_tick).padStart(2, '0')}/{g.max_tick}</b>
          </span>
          {countdown > 0 && g.status === 'RUNNING' && (
            <span className="mono admin-countdown">⏱ {countdown}s</span>
          )}
        </div>
        <div className="admin-header-right">
          <div className="admin-controls">
            {(g.status === 'DRAFT' || g.status === 'READY') && (
              <>
                <button className="btn btn-outline" onClick={handleToggleTestMode}>
                  🧪 Test Mode: {g.is_test_mode ? 'ON (1s)' : `OFF (${g.tick_seconds}s)`}
                </button>
                <button className="btn btn-primary" onClick={handleStart}>
                  ▶ Ring The Bell
                </button>
              </>
            )}
            {g.status === 'RUNNING' && (
              <button className="btn btn-outline" onClick={handlePause}>⏸ Pause</button>
            )}
            {g.status === 'PAUSED' && (
              <button className="btn btn-primary" onClick={handleResume}>▶ Resume</button>
            )}
            <button className="btn btn-outline" onClick={() => setConfirmRestart(true)}>
              🔄 Restart
            </button>
          </div>
          <button className="btn btn-outline btn-sm" onClick={handleLogout}>Logout</button>
        </div>
      </header>

      {/* ── Stats bar ── */}
      <div className="admin-stats-bar">
        <div className="admin-stat">
          <span className="admin-stat-label">Teams</span>
          <span className="admin-stat-value mono">{(game.teams ?? []).length || '—'}</span>
        </div>
        <div className="admin-stat">
          <span className="admin-stat-label">Total Orders</span>
          <span className="admin-stat-value mono">{orders.length}</span>
        </div>
        <div className="admin-stat">
          <span className="admin-stat-label">Tick Duration</span>
          <span className="admin-stat-value mono">{g.is_test_mode ? '1s' : `${g.tick_seconds}s`}</span>
        </div>
        <div className="admin-stat">
          <span className="admin-stat-label">Starting Balance</span>
          <span className="admin-stat-value mono">₡{g.starting_balance?.toLocaleString()}</span>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="admin-tabs">
        <button className={`admin-tab ${activeTab === 'leaderboard' ? 'active' : ''}`} onClick={() => setActiveTab('leaderboard')}>
          🏆 Leaderboard
        </button>
        <button className={`admin-tab ${activeTab === 'orders' ? 'active' : ''}`} onClick={() => setActiveTab('orders')}>
          📋 Orders ({orders.length})
        </button>
        <button className={`admin-tab ${activeTab === 'news' ? 'active' : ''}`} onClick={() => setActiveTab('news')}>
          📰 News Script
        </button>
        <button
          className={`admin-tab ${activeTab === 'generator' ? 'active' : ''}`}
          onClick={() => { setActiveTab('generator'); if (candidates.length === 0) loadCandidates('all'); }}
        >
          💡 News Generator
        </button>
        <button className={`admin-tab ${activeTab === 'audit' ? 'active' : ''}`} onClick={() => setActiveTab('audit')}>
          📜 Audit Log
        </button>
      </div>

      {/* ── Content ── */}
      <div className="admin-content">
        {activeTab === 'leaderboard' && leaderboard && (
          <div className="card admin-table-card">
            <h3>🏆 Live Leaderboard — Tick {leaderboard.tick}</h3>
            <div className="admin-table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Team</th>
                    <th>Portfolio</th>
                    <th>Cash</th>
                    <th>Holdings</th>
                    <th>P&L</th>
                    <th>P&L %</th>
                    <th>Trades</th>
                    <th>Companies</th>
                    <th>Eligible</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.entries.map((e: LeaderboardEntry) => {
                    const plClass = e.profit_loss >= 0 ? 'price-up' : 'price-down';
                    return (
                      <tr key={e.team_code}>
                        <td>
                          <span className={`rank-chip ${e.rank <= 3 ? `rank-${e.rank}` : ''}`}>
                            {e.rank}
                          </span>
                        </td>
                        <td>
                          <div className="admin-cell-main">{e.team_code}</div>
                          <div className="admin-cell-sub">{e.display_name}</div>
                        </td>
                        <td className="mono admin-cell-main">₡{e.portfolio_value.toFixed(2)}</td>
                        <td className="mono">₡{e.cash.toFixed(2)}</td>
                        <td className="mono">₡{e.holdings_value.toFixed(2)}</td>
                        <td className={`mono ${plClass}`}>
                          {e.profit_loss >= 0 ? '+' : ''}₡{e.profit_loss.toFixed(2)}
                        </td>
                        <td className={`mono ${plClass}`}>
                          {e.profit_loss_percent >= 0 ? '+' : ''}{e.profit_loss_percent.toFixed(2)}%
                        </td>
                        <td className="mono">{e.trade_count}</td>
                        <td className="mono">{e.companies_traded}</td>
                        <td>
                          <span className={`badge ${e.is_eligible ? 'badge-green' : 'badge-red'}`}>
                            {e.is_eligible ? 'YES' : 'NO'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'orders' && (
          <div className="card admin-table-card">
            <h3>📋 Recent Orders</h3>
            <div className="admin-table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Team</th>
                    <th>Side</th>
                    <th>Ticker</th>
                    <th>Qty</th>
                    <th>Status</th>
                    <th>Tick</th>
                    <th>Fill Price</th>
                    <th>Fee</th>
                    <th>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.slice(0, 100).map((o: any) => (
                    <tr key={o.order_id}>
                      <td className="admin-cell-main">{o.team_code}</td>
                      <td>
                        <span className={`mono ${o.side === 'BUY' ? 'price-up' : 'price-down'}`} style={{ fontWeight: 800 }}>
                          {o.side}
                        </span>
                      </td>
                      <td className="mono" style={{ color: 'var(--gold-bright)', fontWeight: 700 }}>{o.ticker}</td>
                      <td className="mono">{o.quantity}</td>
                      <td>
                        <span className={`badge ${o.status === 'FILLED' ? 'badge-green' : o.status === 'REJECTED' ? 'badge-red' : 'badge-yellow'}`}>
                          {o.status}
                        </span>
                      </td>
                      <td className="mono">{o.submitted_tick}{o.fill_tick != null ? ` → ${o.fill_tick}` : ''}</td>
                      <td className="mono">{o.fill_price != null ? `₡${o.fill_price.toFixed(2)}` : '—'}</td>
                      <td className="mono">₡{o.fee?.toFixed(2) || '0.00'}</td>
                      <td className="mono admin-cell-sub">{new Date(o.submitted_at).toLocaleTimeString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'audit' && (
          <div className="card admin-table-card">
            <h3>📜 Audit Log</h3>
            <div className="admin-table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Event</th>
                    <th>Team</th>
                    <th>Tick</th>
                    <th>Message</th>
                  </tr>
                </thead>
                <tbody>
                  {audit.slice(0, 100).map((log: any) => (
                    <tr key={log.id}>
                      <td className="mono admin-cell-sub">{new Date(log.created_at).toLocaleTimeString()}</td>
                      <td><span className="badge badge-blue">{log.event_type}</span></td>
                      <td>{log.team_code || '—'}</td>
                      <td className="mono">{log.tick ?? '—'}</td>
                      <td className="admin-cell-capped">{log.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'news' && (
          <div className="card admin-table-card">
            <h3>📰 News Script & Controls</h3>
            <div className="admin-table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Tick</th>
                    <th>Headline</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {newsScript.map((event: any) => (
                    <tr key={event.id}>
                      <td><span className="badge badge-blue">{event.event_type}</span></td>
                      <td className="mono">{event.event_type === 'RESERVE' ? '—' : event.release_tick}</td>
                      <td>
                        <div className="admin-cell-main">{event.headline}</div>
                        {event.forecast && <div className="admin-cell-note">{event.forecast}</div>}
                      </td>
                      <td>
                        {event.released ? (
                          <span className="badge badge-green">
                            RELEASED {event.released_at ? `@ ${new Date(event.released_at).toLocaleTimeString()}` : ''}
                          </span>
                        ) : (
                          <span className="badge badge-yellow">ARMED</span>
                        )}
                      </td>
                      <td>
                        {event.event_type === 'RESERVE' && !event.released && (
                          <button className="btn btn-sell btn-sm" onClick={() => handleFireReserve(event.id)}>
                            Fire Now
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'generator' && (
          <div className="card admin-table-card">
            <div className="admin-gen-head">
              <div>
                <h3>💡 Prep-Time Fictional News Generator</h3>
                <p className="admin-gen-sub">
                  Generates candidate fact-like Meridia headlines across Macro, Company, and Policy templates for pre-event authoring.
                </p>
                <p className="admin-tradewarn">
                  ⚠ Trade fair: candidates are fact-like and non-predictive. Avoid hints that favor any team.
                </p>
              </div>
              <div className="admin-gen-actions">
                {['all', 'macro', 'company', 'policy'].map((cat) => (
                  <button
                    key={cat}
                    className={`btn btn-sm ${candidateCat === cat ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => loadCandidates(cat)}
                  >
                    {cat.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {candidateLoading ? (
              <p className="admin-gen-loading">Generating candidate templates…</p>
            ) : (
              <div className="admin-table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Category</th>
                      <th>Template Title</th>
                      <th>Headline (Factual / Non-predictive)</th>
                      <th>Suggested Shock / Direct Impact</th>
                      <th>Reaction Profile</th>
                    </tr>
                  </thead>
                  <tbody>
                    {candidates.map((c, i) => (
                      <tr key={i}>
                        <td><span className="badge badge-blue">{c.category}{c.ticker ? ` (${c.ticker})` : ''}</span></td>
                        <td className="admin-cell-main">{c.title}</td>
                        <td>{c.headline}</td>
                        <td className="mono admin-mono-blue">{c.suggested_drivers}</td>
                        <td><span className="badge badge-yellow">{c.profile}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Restart confirmation ── */}
      {confirmRestart && (
        <div className="modal-overlay" onClick={() => setConfirmRestart(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 className="admin-modal-title">🔄 Restart Simulation?</h2>
            <ul className="admin-modal-list">
              <li>Reset <strong>all {(game.teams ?? []).length || 25} teams</strong> to ₡{g.starting_balance?.toLocaleString()}</li>
              <li>Clear all orders and holdings</li>
              <li>Reset all news events</li>
              <li>Start a fresh simulation from Tick 0</li>
            </ul>
            <div className="admin-modal-warning">⚠️ This action cannot be undone!</div>
            <div className="admin-modal-actions">
              <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setConfirmRestart(false)}>Cancel</button>
              <button className="btn btn-sell" style={{ flex: 1 }} onClick={handleRestart}>Confirm Restart</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Toast ── */}
      {toast && (
        <div className={`toast toast-${toast.type}`}>
          {toast.type === 'success' ? '✓' : '✗'} {toast.message}
        </div>
      )}
    </div>
  );
}
