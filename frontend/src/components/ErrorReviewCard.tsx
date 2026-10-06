/* ── ErrorReviewCard — rejected-order review card (drawer ERRORS tab) ──
   Presentation only: the rejection record and its Clear handler
   are owned by Dashboard. */
interface Props {
  error: { order: string; message: string; tick: number };
  maxTick: number;
  onClear: () => void;
}

export default function ErrorReviewCard({ error, maxTick, onClear }: Props) {
  return (
    <div className="error-review">
      <p className="error-review-head">
        Order rejected by the exchange — no trade was executed and no fee was charged.
      </p>
      <div className="error-review-card">
        <span className="badge badge-red">{error.tick}/{maxTick}</span>
        <div className="error-review-body">
          <span className="error-review-order mono">{error.order}</span>
          <span className="error-review-msg">{error.message}</span>
        </div>
        <button className="btn btn-outline btn-sm" onClick={onClear}>
          Clear
        </button>
      </div>
    </div>
  );
}
