/* ── THE WOLF OF WALL STREET — Trading Arena (Dashboard) ──
   Layout: command bar → ticker tape → [Meridia board | chart arena +
   positions strip | order ticket]. Positions / Orders / Meridia Wire /
   Errors live in the slide-out Floor Records drawer. All data flows
   exactly as before: REST + WebSocket from the backend; this component
   is the single state hub — the new children are presentation-only. */
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getGameState, getMarketOverview, getNews, getPortfolio,
  getOrders, getCandles, submitBuy, submitSell,
  createMarketWebSocket, logout,
} from '../api/client';
import type {
  GameState, MarketOverview, NewsResponse, Portfolio,
  OrderResponse, CandlesResponse, CompanyPrice, WSMarketMessage,
  CandleData,
} from '../types';
import CommandBar from '../components/CommandBar';
import Watchlist from '../components/Watchlist';
import ChartStage from '../components/ChartStage';
import type { ChartStyle } from '../components/TerminalChart';
import OrderTicket from '../components/OrderTicket';
import FloorDrawer, { type FloorTab } from '../components/FloorDrawer';
import TickerTape from '../components/TickerTape';
import './Dashboard.css';

const POLL_MS = 10000;
const MIN_ORDER_VALUE = 100;

export default function Dashboard() {
  const navigate = useNavigate();

  // ── Server state (identical data sources as before) ──
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [market, setMarket] = useState<MarketOverview | null>(null);
  const [news, setNews] = useState<NewsResponse | null>(null);
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [orders, setOrders] = useState<OrderResponse[]>([]);
  const [candles, setCandles] = useState<Record<string, CandleData[]>>({});

  // ── UI state ──
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null);
  const [chartStyle, setChartStyle] = useState<ChartStyle>('candles');
  const [bottomTab, setBottomTab] = useState<FloorTab>('positions');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawerCloseRef = useRef<HTMLButtonElement>(null);
  const [toast, setToast] = useState<{ id: number; message: string; type: 'success' | 'error' } | null>(null);
  const [lastError, setLastError] = useState<{ order: string; message: string; tick: number } | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [priceDir, setPriceDir] = useState<Record<string, 'up' | 'down'>>({});
  const [tickPulse, setTickPulse] = useState(0);

  const fetchAllDataRef = useRef<() => void>(() => {});
  const intervalRef = useRef<number | null>(null);
  const teamCode = localStorage.getItem('ms_team_code') || '';
  const displayName = localStorage.getItem('ms_display_name') || '';

  // ── Fetch all data (unchanged endpoints) ──
  const fetchAllData = useCallback(async () => {
    try {
      const [gs, mk, nw, pf, od] = await Promise.all([
        getGameState(), getMarketOverview(), getNews(),
        getPortfolio(), getOrders(),
      ]);
      setGameState(gs);
      setMarket(mk);
      setNews(nw);
      setPortfolio(pf);
      setOrders(od.orders || []);
      setIsReconnecting(false);

      // Candles for every company (backend-generated OHLC)
      const tickers = (mk.prices || []).map((p: CompanyPrice) => p.ticker);
      const candleResults = await Promise.all(tickers.map((t: string) => getCandles(t)));
      const candleMap: Record<string, CandleData[]> = {};
      candleResults.forEach((c: CandlesResponse) => {
        candleMap[c.ticker] = c.candles;
      });
      setCandles(candleMap);
    } catch (err) {
      console.error('Fetch error:', err);
    }
  }, []);

  fetchAllDataRef.current = fetchAllData;

  // ── Initial load + periodic reconciliation poll ──
  useEffect(() => {
    fetchAllData();
    intervalRef.current = window.setInterval(fetchAllData, POLL_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchAllData]);

  // ── WebSocket: live prices, tick + status, latest news ──
  useEffect(() => {
    const managedWs = createMarketWebSocket(
      (data: WSMarketMessage) => {
        if (data.type === 'market_update') {
          setGameState((prev) => {
            if (prev && prev.current_tick !== data.tick) {
              fetchAllDataRef.current(); // tick advanced → refresh fills/portfolio
              setTickPulse((t) => t + 1);
            }
            return prev
              ? {
                  ...prev,
                  current_tick: data.tick,
                  status: data.status,
                  server_time: data.server_time,
                  tick_started_at: data.tick_started_at,
                  next_tick_at: data.next_tick_at,
                }
              : prev;
          });

          if (data.prices) {
            setPriceDir((dirs) => {
              const next = { ...dirs };
              data.prices?.forEach((dp) => {
                const old = market?.prices.find((p) => p.ticker === dp.ticker);
                if (old) {
                  if (dp.price > old.price) next[dp.ticker] = 'up';
                  else if (dp.price < old.price) next[dp.ticker] = 'down';
                }
              });
              return next;
            });
            setMarket((prev) => {
              if (!prev) return prev;
              return {
                ...prev,
                tick: data.tick,
                prices: prev.prices.map((p) => {
                  const updated = data.prices?.find((dp) => dp.ticker === p.ticker);
                  return updated
                    ? { ...p, price: updated.price, change: updated.change, change_percent: updated.change_percent }
                    : p;
                }),
              };
            });
          }
          setIsReconnecting(false);
        }
      },
      (reconnecting: boolean) => setIsReconnecting(reconnecting),
    );
    return () => managedWs.close();
  }, []);

  // ── Countdown to next tick ──
  useEffect(() => {
    if (!gameState?.next_tick_at) return;
    const tick = () => {
      const next = new Date(gameState.next_tick_at!).getTime();
      setCountdown(Math.max(0, Math.floor((next - Date.now()) / 1000)));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [gameState?.next_tick_at]);

  // ── Default selection: first ticker once market loads ──
  useEffect(() => {
    if (!selectedTicker && market?.prices?.length) {
      setSelectedTicker(market.prices[0].ticker);
    }
  }, [market, selectedTicker]);

  // ── Trading ──
  const handleTrade = async (side: 'BUY' | 'SELL', quantity: number) => {
    if (!selectedTicker) return;
    const summary = `${side} ${quantity} ${selectedTicker}`;
    try {
      if (side === 'BUY') {
        await submitBuy(selectedTicker, quantity);
      } else {
        await submitSell(selectedTicker, quantity);
      }
      setLastError(null);
      showToast(`${summary} routed — fills at Tick ${(gameState?.current_tick ?? 0) + 1}`, 'success');
      fetchAllData();
    } catch (err: any) {
      const message = err?.message || 'Order failed';
      // Persist rejected orders so they are reviewable (drawer tab + audit
      // trail), not just a transient toast that vanishes after 4 seconds.
      // Open the drawer on the ERRORS tab so the rejection is unmissable.
      setLastError({ order: summary, message, tick: gameState?.current_tick ?? 0 });
      setBottomTab('errors');
      setDrawerOpen(true);
      showToast(`✗ ${summary} rejected — ${message}`, 'error');
    }
  };

  const showToast = (message: string, type: 'success' | 'error') => {
    const id = Date.now();
    setToast({ id, message, type });
    setTimeout(() => {
      setToast((cur) => (cur?.id === id ? null : cur));
    }, 4000);
  };

  const handleLogout = async () => {
    try { await logout(); } catch (_) {}
    localStorage.clear();
    navigate('/');
  };

  // ── Drawer keyboard support: Escape closes, focus moves into the panel ──
  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDrawerOpen(false);
    };
    window.addEventListener('keydown', onKey);
    drawerCloseRef.current?.focus();
    return () => window.removeEventListener('keydown', onKey);
  }, [drawerOpen]);

  // ── Derived values ──
  const selectedStock = useMemo(
    () => market?.prices.find((p) => p.ticker === selectedTicker) ?? null,
    [market, selectedTicker],
  );

  const simTime = useMemo(() => {
    if (!gameState) return '--:--:--';
    const totalSecs = Math.round(gameState.current_tick * gameState.tick_seconds);
    const h = Math.floor(totalSecs / 3600);
    const m = Math.floor((totalSecs % 3600) / 60);
    const s = totalSecs % 60;
    return [h, m, s].map((v) => String(v).padStart(2, '0')).join(':');
  }, [gameState]);

  const gameRunning = gameState?.status === 'RUNNING';
  const openHoldings = useMemo(
    () => portfolio?.holdings.filter((h) => h.quantity > 0) ?? [],
    [portfolio],
  );

  // Loading state: cinematic stand-by screen
  if (!gameState || !market) {
    return (
      <div className="terminal-loading">
        <div className="tl-logo">
          <svg width="52" height="52" viewBox="0 0 48 48" fill="none">
            <path d="M6 36 L12 26 L18 30 L26 16 L32 22 L42 10" stroke="#e8c558" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
            <rect x="20" y="26" width="4" height="14" rx="1" fill="#e8c558" />
          </svg>
        </div>
        <div className="loading-spinner" style={{ width: 34, height: 34 }} />
        <p className="mono">ESTABLISHING FLOOR LINK…</p>
      </div>
    );
  }

  return (
    <div className="terminal">
      {/* ══════════ Command bar ══════════ */}
      <CommandBar
        gameState={gameState}
        portfolio={portfolio}
        simTime={simTime}
        countdown={countdown}
        tickPulse={tickPulse}
        drawerOpen={drawerOpen}
        onToggleDrawer={() => setDrawerOpen((o) => !o)}
        holdingsCount={openHoldings.length}
        ordersCount={orders.length}
        hasError={!!lastError}
        isReconnecting={isReconnecting}
        displayName={displayName}
        teamCode={teamCode}
        onLogout={handleLogout}
      />

      {/* ══════════ Ticker tape ══════════ */}
      <TickerTape
        prices={market.prices}
        latestNews={news?.released_events?.[0] ?? null}
        upcoming={news?.upcoming_scheduled ?? []}
      />

      {/* ══════════ Main grid ══════════ */}
      <div className="terminal-main">
        {/* ── Meridia board (watchlist) ── */}
        <aside className="tl-panel tl-watchlist">
          <div className="panel-head">
            <h2>MERIDIA BOARD</h2>
            <span className="mono panel-head-meta">{market.prices.length} LISTED</span>
          </div>
          <Watchlist
            prices={market.prices}
            candles={candles}
            selected={selectedTicker}
            onSelect={setSelectedTicker}
            lastDirection={priceDir}
          />
          <div className="watchlist-foot mono">
            RULES: NEXT-TICK FILLS · ₡{MIN_ORDER_VALUE} MIN · {gameState.trade_fee_percent}% FEE · {gameState.cooldown_seconds}s COOLDOWN
          </div>
        </aside>

        {/* ── Center arena: chart centerpiece + always-visible positions strip ── */}
        <section className="tl-center">
          <div className="tl-panel tl-chart-panel">
            <ChartStage
              stock={selectedStock}
              chartStyle={chartStyle}
              onStyleChange={setChartStyle}
              candles={candles}
            />
          </div>

          <button
            type="button"
            className={`pos-strip ${openHoldings.length === 0 ? 'pos-strip-flat' : ''}`}
            onClick={() => { setBottomTab('positions'); setDrawerOpen(true); }}
            aria-label="Open positions panel"
            title="Open the full positions table"
          >
            <span className="pos-strip-label">
              POSITIONS
              <span className="dock-count mono">{openHoldings.length}</span>
            </span>
            {openHoldings.length === 0 ? (
              <span className="pos-strip-empty mono">FLAT — no open positions</span>
            ) : (
              openHoldings.map((h) => {
                const up = h.unrealized_pl >= 0;
                return (
                  <span key={h.ticker} className={`pos-chip ${up ? 'pos-chip-up' : 'pos-chip-down'}`}>
                    <b className="mono">{h.ticker}</b>
                    <span className="mono">{h.quantity} sh @ ₡{h.average_cost.toFixed(2)}</span>
                    <span className="mono pos-chip-pnl">
                      {up ? '+' : ''}₡{h.unrealized_pl.toFixed(2)}
                    </span>
                  </span>
                );
              })
            )}
            <span className="pos-strip-more mono" aria-hidden="true">TABLE →</span>
          </button>
        </section>

        {/* ── Order ticket ── */}
        <aside className="tl-panel tl-ticket">
          <div className="panel-head">
            <h2>ORDER TICKET</h2>
            <span className="mono panel-head-meta">NEXT-TICK FILL</span>
          </div>
          <OrderTicket
            stock={selectedStock}
            portfolio={portfolio}
            feePercent={gameState.trade_fee_percent}
            minOrderValue={MIN_ORDER_VALUE}
            gameRunning={!!gameRunning}
            cooldownSeconds={gameState.cooldown_seconds}
            buyLimitPercent={gameState.buy_limit_percent}
            onSubmit={handleTrade}
          />
        </aside>

      </div>

      {/* ══════════ Floor records drawer (Positions / Orders / Wire / Errors) ══════════ */}
      <FloorDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        tab={bottomTab}
        onTab={setBottomTab}
        portfolio={portfolio}
        orders={orders}
        news={news}
        lastError={lastError}
        gameState={gameState}
        closeRef={drawerCloseRef}
        onClearError={() => {
          setLastError(null);
          // Don't leave the drawer stranded on a now-empty ERRORS tab
          setBottomTab((t) => (t === 'errors' ? 'positions' : t));
        }}
      />

      {/* ══════════ Toast ══════════ */}
      {toast && (
        <div className={`toast toast-${toast.type}`}>
          {toast.type === 'success' ? '✓' : '✗'} {toast.message}
        </div>
      )}
    </div>
  );
}
