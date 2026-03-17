import { useState, type ReactNode } from "react";
import { RIGS, formatSbtc, formatUsdcx, getReferralFromUrl } from "../lib/constants";
import { SbtcIcon, UsdcxIcon } from "./TokenIcons";
import { buyHashes, buyHashesUsdcx } from "../lib/stacks";
import { satsToUsdcx } from "../lib/pyth";
import { useHashQuote, useBtcUsdPrice } from "../hooks/useQueries";
import { CpuIcon, GpuIcon, FpgaIcon, AsicIcon } from "./RigIcons";


type PayToken = "sbtc" | "usdcx";

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

export default function BuyHashes({ address, gameOngoing, onTx }: Props) {
  const [hashAmount, setHashAmount] = useState(0);
  const [rig, setRig] = useState<number>(RIGS.GPU.id);
  const [payToken, setPayToken] = useState<PayToken>("sbtc");

  const { data: quote, isLoading: quoteLoading } = useHashQuote(hashAmount);
  const { data: btcUsdPrice } = useBtcUsdPrice(payToken === "usdcx");

  function handleBuy() {
    if (!address || !quote || hashAmount <= 0) return;
    const referrer = getReferralFromUrl();

    if (payToken === "usdcx" && btcUsdPrice) {
      const costUsdcx = satsToUsdcx(quote, btcUsdPrice);
      const maxUsdcx = Math.ceil(costUsdcx * 1.02);
      buyHashesUsdcx(hashAmount, rig, maxUsdcx, referrer, onTx);
    } else {
      const maxSbtc = Math.ceil(quote * 1.01);
      buyHashes(hashAmount, rig, maxSbtc, referrer, onTx);
    }
  }

  const perHash = quote !== undefined && quote !== null && hashAmount > 0
    ? quote / hashAmount
    : null;

  const canBuy = !!address && gameOngoing && hashAmount > 0 && quote != null && !quoteLoading
    && (payToken === "sbtc" || btcUsdPrice != null);

  function getButtonLabel(): ReactNode {
    if (!address) return "Connect Wallet to Mine";
    if (!gameOngoing) return "Round in Cooldown";
    if (quoteLoading) return "Calculating...";
    if (quote != null && hashAmount > 0) {
      if (payToken === "usdcx" && btcUsdPrice) {
        return <>Pay {formatUsdcx(satsToUsdcx(quote, btcUsdPrice))} <UsdcxIcon size={18} /></>;
      }
      return <>Pay {formatSbtc(quote)} <SbtcIcon size={18} /></>;
    }
    return "Enter Hash Amount";
  }

  return (
    <div className="card buy-hashes">
      <h2>Buy Hashes</h2>

      {/* Token selector */}
      <div className="form-group">
        <label>Pay With</label>
        <div className="token-selector">
          <button
            className={`btn token-btn ${payToken === "sbtc" ? "token-active" : ""}`}
            onClick={() => setPayToken("sbtc")}
          >
            <img src="/sbtc.png" alt="sBTC" width={18} height={18} className="token-icon" /> sBTC
          </button>
          <button
            className={`btn token-btn ${payToken === "usdcx" ? "token-active" : ""}`}
            onClick={() => setPayToken("usdcx")}
          >
            <img src="/usdc.png" alt="USDCx" width={18} height={18} className="token-icon" /> USDCx
          </button>
        </div>
        {payToken === "usdcx" && btcUsdPrice && (
          <small className="oracle-price">
            BTC/USD: ${btcUsdPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })} (Pyth Oracle)
          </small>
        )}
      </div>

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
          {payToken === "sbtc" ? (
            <span>{formatSbtc(Math.round(perHash))} <SbtcIcon size={14} /> per hash</span>
          ) : btcUsdPrice ? (
            <span>{formatUsdcx(satsToUsdcx(Math.round(perHash), btcUsdPrice))} <UsdcxIcon size={14} /> per hash</span>
          ) : null}
        </div>
      )}

      {/* Show both denominations when USDCx selected */}
      {payToken === "usdcx" && quote != null && hashAmount > 0 && btcUsdPrice && !quoteLoading && (
        <div className="price-per-hash" style={{ opacity: 0.7 }}>
          <span>{formatSbtc(quote)} <SbtcIcon size={14} /> equivalent</span>
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
}
