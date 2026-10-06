/* ── OrderTicket — execution console ──
   Mirrors backend constraints (₡100 minimum, fee %, next-tick fill,
   cooldown) purely for UX; the server remains the single source of truth.
   The logic block below (state, effects, caps, canSubmit, submit) is the
   validated trading contract — the markup around it is presentation. */
import { useState, useEffect, useRef } from 'react';
import type { CompanyPrice, Portfolio } from '../types';
import './OrderTicket.css';

interface Props {
  stock: CompanyPrice | null;
  portfolio: Portfolio | null;
  feePercent: number;
  minOrderValue: number;
  gameRunning: boolean;
  cooldownSeconds: number;
  /** Server rule: a single buy may not exceed this % of the starting balance */
  buyLimitPercent: number;
  onSubmit: (side: 'BUY' | 'SELL', quantity: number) => Promise<void>;
}

export default function OrderTicket({ stock, portfolio, feePercent, minOrderValue, gameRunning, cooldownSeconds, buyLimitPercent, onSubmit }: Props) {
  const [side, setSide] = useState<'BUY' | 'SELL'>('BUY');
  const [qty, setQty] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [cooldownLeft, setCooldownLeft] = useState(0);
  const cooldownTimer = useRef<number | null>(null);

  // Reset the ticket when switching instruments
  useEffect(() => {
    setQty('');
  }, [stock?.ticker]);

  // If the position disappears (full liquidation, game restart), a lingering
  // SELL side would silently disable the whole ticket — fall back to BUY.
  useEffect(() => {
    const holding = portfolio?.holdings?.find((h) => h.ticker === stock?.ticker);
    if (side === 'SELL' && (holding?.quantity ?? 0) === 0) {
      setSide('BUY');
      setQty('');
    }
  }, [portfolio, stock?.ticker, side]);

  // Clear the cooldown ticker on unmount
  useEffect(() => () => {
    if (cooldownTimer.current !== null) window.clearInterval(cooldownTimer.current);
  }, []);

  // Visual countdown mirroring the server's cooldown rule (informational only —
  // the server still enforces and re-checks everything on every request).
  const startCooldown = () => {
    const end = Date.now() + cooldownSeconds * 1000;
    if (cooldownTimer.current !== null) window.clearInterval(cooldownTimer.current);
    const tickFn = () => {
      const left = Math.max(0, Math.ceil((end - Date.now()) / 1000));
      setCooldownLeft(left);
      if (left <= 0 && cooldownTimer.current !== null) {
        window.clearInterval(cooldownTimer.current);
        cooldownTimer.current = null;
      }
    };
    tickFn();
    cooldownTimer.current = window.setInterval(tickFn, 250);
  };

  if (!stock) {
    return (
      <div className="ticket-empty">
        <div className="ticket-empty-icon">⌁</div>
        <p>Select an instrument from the watchlist</p>
      </div>
    );
  }

  const holding = portfolio?.holdings?.find((h) => h.ticker === stock.ticker);
  const holdingQty = holding?.quantity ?? 0;

  const quantity = parseInt(qty, 10) || 0;
  const estValue = quantity * stock.price;
  const fee = estValue * (feePercent / 100);
  const total = side === 'BUY' ? estValue + fee : estValue - fee;

  // Mirror the server's two buy caps so presets/quantity never guarantee a
  // rejection: available cash AND the per-order % of starting balance.
  const buyUnit = stock.price * (1 + feePercent / 100);
  const maxByCash = Math.floor(((portfolio?.cash ?? 0) * 0.99) / buyUnit);
  const maxByLimit = Math.floor(((portfolio?.starting_balance ?? 0) * (buyLimitPercent / 100)) / buyUnit);
  const cashBound = maxByCash <= maxByLimit;
  const maxBuy = Math.max(0, Math.min(maxByCash, maxByLimit));
  const maxQty = side === 'BUY' ? maxBuy : holdingQty;
  const meetsMin = estValue >= minOrderValue;
  const exceedsMax = quantity > maxQty;
  const canSubmit = gameRunning && quantity > 0 && !exceedsMax && meetsMin && cooldownLeft === 0 && !submitting;

  const submit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await onSubmit(side, quantity);
      setQty('');
      startCooldown();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={`ticket ${side === 'SELL' ? 'ticket-sell' : 'ticket-buy'}`}>
      {/* Everything above the action lives in a scrollable middle section so
          the BUY/SELL button itself is ALWAYS visible — never clipped, never
          requiring a scroll to reach. */}
      <div className="ticket-scroll">
      {/* ── Instrument plaque ── */}
      <div className="ticket-ident">
        <div className="ti-left">
          <span className="ti-ticker mono">{stock.ticker}</span>
          <span className="ti-name">{stock.name}</span>
        </div>
        <div className="ti-right">
          <span key={stock.price} className={`ti-price mono ${stock.change >= 0 ? 'price-up' : 'price-down'}`}>
            ₡{stock.price.toFixed(2)}
          </span>
          <span className={`ti-change mono ${stock.change >= 0 ? 'price-up' : 'price-down'}`}>
            {stock.change >= 0 ? '+' : ''}{stock.change.toFixed(2)} ({stock.change_percent.toFixed(2)}%)
          </span>
        </div>
      </div>

      {/* ── Side selector ── */}
      <div className={`ticket-sides ${side === 'SELL' ? 'sell-mode' : ''}`} role="group" aria-label="Order side">
        <button
          type="button"
          className={`ticket-side buy ${side === 'BUY' ? 'active' : ''}`}
          onClick={() => setSide('BUY')}
          disabled={!gameRunning}
          aria-pressed={side === 'BUY'}
        >
          BUY / LONG
        </button>
        <button
          type="button"
          className={`ticket-side sell ${side === 'SELL' ? 'active' : ''}`}
          onClick={() => setSide('SELL')}
          disabled={!gameRunning || holdingQty === 0}
          title={holdingQty === 0 ? 'No position to sell' : undefined}
          aria-pressed={side === 'SELL'}
        >
          SELL / SHORT
        </button>
      </div>

      {/* ── Quantity ── */}
      <div className="ticket-qty">
        <label htmlFor="ticket-qty-input">Quantity</label>
        <div className="tq-row">
          <input
            id="ticket-qty-input"
            className="input mono"
            type="number"
            min={1}
            max={maxQty}
            inputMode="numeric"
            aria-label={`Quantity of ${stock.ticker} shares`}
            placeholder="0"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            disabled={!gameRunning}
          />
          {[0.25, 0.5, 1].map((f) => (
            <button
              key={f}
              type="button"
              className="btn btn-outline btn-sm tq-preset"
              onClick={() => setQty(String(Math.max(0, Math.floor(maxQty * f))))}
              disabled={!gameRunning || maxQty === 0}
              title={`${Math.floor(maxQty * f)} shares`}
            >
              {f === 1 ? 'MAX' : `${f * 100}%`}
            </button>
          ))}
        </div>
        <div className="tq-hint mono">
          {side === 'BUY'
            ? <>Buying power <b>₡{(portfolio?.cash ?? 0).toFixed(2)}</b> · per-order cap {buyLimitPercent}% = <b>₡{((portfolio?.starting_balance ?? 0) * buyLimitPercent / 100).toFixed(0)}</b></>
            : <>Position <b>{holdingQty}</b> sh @ ₡{(holding?.average_cost ?? 0).toFixed(2)} avg</>}
        </div>
      </div>

      {/* ── Order preview ── */}
      <div className="ticket-preview">
        <div className="tp-row">
          <span>Est. {side === 'BUY' ? 'cost' : 'proceeds'}</span>
          <span className="mono">₡{estValue.toFixed(2)}</span>
        </div>
        <div className="tp-row">
          <span>Fee ({feePercent}%)</span>
          <span className="mono">₡{fee.toFixed(2)}</span>
        </div>
        <div className="tp-row tp-total">
          <span>{side === 'BUY' ? 'Total debit' : 'Net credit'}</span>
          <span className="mono">₡{total.toFixed(2)}</span>
        </div>
      </div>

      {!gameRunning && (
        <div className="ticket-notice gold" role="status">MARKET CLOSED — TRADING DISABLED</div>
      )}
      {gameRunning && quantity > 0 && !meetsMin && (
        <div className="ticket-notice red" role="alert">
          ⚠ Below ₡{minOrderValue.toFixed(0)} minimum order value
        </div>
      )}
      {gameRunning && exceedsMax && (
        <div className="ticket-notice red" role="alert">
          ⚠ {side === 'BUY' ? (cashBound ? 'Exceeds buying power' : `Exceeds ${buyLimitPercent}% per-order buy cap`) : 'Exceeds position'} — max {maxQty} sh
        </div>
      )}
      {cooldownLeft > 0 && (
        <div className="ticket-notice gold" role="status">
          COOLDOWN — next order in {cooldownLeft}s
        </div>
      )}
      </div>

      {/* ── Submit (pinned — always within the initial viewport) ── */}
      <button
        type="button"
        className={`btn ticket-submit ${side === 'BUY' ? 'btn-buy' : 'btn-sell'}`}
        disabled={!canSubmit}
        onClick={submit}
      >
        {submitting ? (
          <><span className="loading-spinner" style={{ width: 15, height: 15, borderTopColor: 'currentColor' }} /> ROUTING…</>
        ) : cooldownLeft > 0 ? (
          `WAIT ${cooldownLeft}s`
        ) : (
          `${side} ${quantity > 0 ? quantity : ''} ${stock.ticker}`.trim()
        )}
      </button>

      <div className="ticket-fineprint">
        Fills at <b>next tick's price</b> · {cooldownSeconds}s cooldown between orders
      </div>
    </div>
  );
}
