import { useState, useEffect, memo, type ReactNode } from "react";
import { RIGS, formatSbtc, getReferralFromUrl } from "../lib/constants";
import { SbtcIcon } from "./TokenIcons";
import { buyHashes } from "../lib/stacks";
import { useHashQuote } from "../hooks/useQueries";
import { CpuIcon, GpuIcon, FpgaIcon, AsicIcon } from "./RigIcons";

const RIG_META: Record<number, { icon: (active: boolean) => ReactNode; color: string; tagline: string }> = {
  1: { icon: (a) => <CpuIcon active={a} />, color: "var(--green)", tagline: "Humble but honest" },
  2: { icon: (a) => <GpuIcon active={a} />, color: "var(--blue)", tagline: "Parallel power" },
  3: { icon: (a) => <FpgaIcon active={a} />, color: "var(--pink)", tagline: "Programmable fury" },
  4: { icon: (a) => <AsicIcon active={a} />, color: "var(--yellow)", tagline: "Industrial dominance" },
};

interface Props {
  address: string | null;
  gameOngoing: boolean;
  onTx: (txId: string) => void;
}

export default memo(function BuyHashes({ address, gameOngoing, onTx }: Props) {
  const [hashAmount, setHashAmount] = useState(0);
  const [rig, setRig] = useState<number>(RIGS.GPU.id);
  const [debouncedHashAmount, setDebouncedHashAmount] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedHashAmount(hashAmount), 400);
    return () => clearTimeout(timer);
  }, [hashAmount]);

  const { data: quote, isLoading: quoteLoading } = useHashQuote(debouncedHashAmount);

  function handleBuy() {
    if (!address || !quote || hashAmount <= 0) return;
    const referrer = getReferralFromUrl();
    const maxSbtc = Math.ceil(quote * 1.01);
    buyHashes(hashAmount, rig, maxSbtc, referrer, onTx);
  }

  const perHash = quote !== undefined && quote !== null && debouncedHashAmount > 0
    ? quote / debouncedHashAmount
    : null;

  const canBuy = !!address && gameOngoing && debouncedHashAmount > 0 && quote != null && !quoteLoading;

  function getButtonLabel(): ReactNode {
    if (!address) return "Connect Wallet to Mine";
    if (!gameOngoing) return "Round in Cooldown";
    if (quoteLoading) return "Calculating...";
    if (quote != null && hashAmount > 0) {
      return <>Pay {formatSbtc(quote)} <SbtcIcon size={18} /></>;
    }
    return "Enter Hash Amount";
  }

  return (
    <div className="card buy-hashes">
      <h2>Buy Hashes</h2>

      <div className="form-group">
        <label>Hash Rate</label>
        <div className="hashrate-input">
          <div className="hashrate-display">
            <span className="hashrate-value">{hashAmount.toLocaleString()}</span>
            <span className="hashrate-unit">H/s</span>
          </div>
          <div className="hashrate-increment-row">
            {[1, 5, 10, 50].map((n) => (
              <button
                key={n}
                className="btn hashrate-inc-btn"
                onClick={() => setHashAmount((prev) => prev + n)}
              >
                +{n}
              </button>
            ))}
            <button
              className="btn hashrate-reset-btn"
              onClick={() => setHashAmount(0)}
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      <div className="form-group">
        <label>Choose your Mining Rig</label>
        <div className="rig-selector">
          {Object.values(RIGS).map((r) => {
            const meta = RIG_META[r.id];
            return (
              <button
                key={r.id}
                className={`rig-option ${rig === r.id ? "rig-active" : ""}`}
                onClick={() => setRig(r.id)}
                style={rig === r.id ? { borderColor: meta.color } : undefined}
              >
                <span className="rig-icon">{meta.icon(rig === r.id)}</span>
                <strong style={{ color: rig === r.id ? meta.color : undefined }}>
                  {r.label}
                </strong>
                <small>{meta.tagline}</small>
                <small>{r.desc}</small>
              </button>
            );
          })}
        </div>
      </div>

      {/* Per-hash cost hint */}
      {perHash !== null && !quoteLoading && (
        <div className="price-per-hash">
          <span>{formatSbtc(Math.round(perHash))} <SbtcIcon size={14} /> per hash</span>
        </div>
      )}

      <button
        className="btn btn-primary btn-buy"
        disabled={!canBuy}
        onClick={handleBuy}
      >
        {getButtonLabel()}
      </button>
    </div>
  );
});
