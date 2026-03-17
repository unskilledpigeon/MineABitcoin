import { useState } from "react";
import { toast } from "sonner";
import { MINER_TAG_COST, formatSbtc, formatUsdcx } from "../lib/constants";
import { SbtcIcon, UsdcxIcon } from "./TokenIcons";
import { registerMinerTag, registerMinerTagUsdcx } from "../lib/stacks";
import { satsToUsdcx } from "../lib/pyth";
import { useBtcUsdPrice } from "../hooks/useQueries";

type PayToken = "sbtc" | "usdcx";

interface Props {
  address: string | null;
  currentTag: string | null;
  onTx: (txId: string) => void;
}

const RESERVED_TAGS = new Set([
  "home", "about", "how-to-play", "dashboard", "admin", "api",
  "app", "login", "signup", "settings", "help", "faq", "terms",
  "privacy", "leaderboard",
]);

export default function RegisterTag({ address, currentTag, onTx }: Props) {
  const [tag, setTag] = useState("");
  const [copied, setCopied] = useState(false);
  const [payToken, setPayToken] = useState<PayToken>("sbtc");

  const { data: btcUsdPrice } = useBtcUsdPrice(payToken === "usdcx");

  const isReserved = RESERVED_TAGS.has(tag.toLowerCase());

  function handleRegister() {
    if (!address || tag.length < 3 || isReserved) return;
    if (payToken === "usdcx") {
      registerMinerTagUsdcx(tag, onTx);
    } else {
      registerMinerTag(tag, onTx);
    }
  }

  function copyReferralLink() {
    if (!currentTag) return;
    const link = `${window.location.origin}/${currentTag}`;
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      toast.success("Referral link copied!");
      setTimeout(() => setCopied(false), 2000);
    });
  }

  if (currentTag) {
    const referralLink = `${window.location.origin}/${currentTag}`;
    return (
      <div className="card register-tag">
        <h2>Miner Tag</h2>
        <div className="current-tag">
          Your tag: <code>{currentTag}</code>
        </div>
        <div className="referral-link">
          <label>Your Referral Link</label>
          <div className="referral-link-row">
            <code className="referral-url">{referralLink}</code>
            <button className="btn btn-sm" onClick={copyReferralLink}>
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
        </div>
        <p className="tag-share">Share this link to earn 7% on their deposits.</p>
      </div>
    );
  }

  const feeDisplay = payToken === "usdcx" && btcUsdPrice
    ? <>{formatUsdcx(satsToUsdcx(MINER_TAG_COST, btcUsdPrice))} <UsdcxIcon /></>
    : <>{formatSbtc(MINER_TAG_COST)} <SbtcIcon /></>;

  return (
    <div className="card register-tag">
      <h2>Register Miner Tag</h2>

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
      </div>

      <p className="tag-cost">
        Cost: {feeDisplay}
      </p>

      <div className="form-group">
        <label>Your Tag (3-24 chars)</label>
        <input
          type="text"
          maxLength={24}
          placeholder="e.g. satoshi_miner"
          value={tag}
          onChange={(e) => setTag(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ""))}
        />
      </div>

      {tag.length >= 3 && !isReserved && (
        <p className="referral-preview">
          Your referral link will be: <code>{window.location.origin}/{tag}</code>
        </p>
      )}
      {isReserved && (
        <p className="referral-preview" style={{ color: "#ff4d4d" }}>
          This tag is reserved and cannot be used.
        </p>
      )}

      <button
        className="btn btn-primary"
        disabled={!address || tag.length < 3 || isReserved}
        onClick={handleRegister}
      >
        {!address ? "Connect Wallet First" : "Register Tag"}
      </button>
    </div>
  );
}
