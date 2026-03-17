import { useState, useEffect, useMemo } from "react";
import { Toaster } from "sonner";
import "./App.css";
import ConnectWallet from "./components/ConnectWallet";
import RoundStatus from "./components/RoundStatus";
import BuyHashes from "./components/BuyHashes";
import RegisterTag from "./components/RegisterTag";
import MinerDashboard from "./components/MinerDashboard";
import CooldownOverlay from "./components/CooldownOverlay";
import { SbtcIcon, UsdcxIcon } from "./components/TokenIcons";
import { formatSbtcCompact, formatUsdcx, heroTagline } from "./lib/constants";
import { claimMiningReward, claimMiningRewardDual } from "./lib/stacks";
import {
  useRoundInfo,
  useSharesStats,
  useUsdcxPools,
  useLastMiner,
  useMinerTag,
  useMinerData,
  useInvalidateOnTx,
} from "./hooks/useQueries";

const STATE_ONGOING = 1;
const STATE_COOLDOWN = 2;

function HashRain() {
  const columns = useMemo(() => {
    const chars = "0123456789abcdef";
    return Array.from({ length: 12 }, (_, i) => {
      const text = Array.from({ length: 40 }, () =>
        chars[Math.floor(Math.random() * chars.length)]
      ).join("\n");
      return {
        left: `${(i / 12) * 100 + Math.random() * 5}%`,
        duration: `${15 + Math.random() * 20}s`,
        delay: `${-Math.random() * 20}s`,
        text,
      };
    });
  }, []);

  return (
    <div className="hash-rain">
      {columns.map((col, i) => (
        <div
          key={i}
          className="hash-column"
          style={{
            left: col.left,
            animationDuration: col.duration,
            animationDelay: col.delay,
          }}
        >
          {col.text}
        </div>
      ))}
    </div>
  );
}

function App() {
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    return (localStorage.getItem("theme") as "dark" | "light") || "dark";
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  const [address, setAddress] = useState<string | null>(() => {
    const saved = localStorage.getItem("stx-address");
    if (saved && !saved.startsWith("S")) {
      localStorage.removeItem("stx-address");
      return null;
    }
    return saved;
  });

  // TanStack Query hooks — auto-poll every 30s
  const { data: roundData, isLoading: roundLoading } = useRoundInfo();
  const { data: sharesStats } = useSharesStats();
  const { data: usdcxPools } = useUsdcxPools();
  const hasUsdcxInPools = usdcxPools?.hasAny ?? false;
  const { data: lastMiner } = useLastMiner();
  const { data: minerTag } = useMinerTag(address);
  const { data: minerResult } = useMinerData(address, roundData?.round);
  const invalidateOnTx = useInvalidateOnTx();

  const minerData = minerResult?.minerData ?? null;
  const pendingReward = minerResult?.pendingReward ?? 0;
  const referralEarnings = minerResult?.referralEarnings ?? 0;
  const referralEarningsUsdcx = minerResult?.referralEarningsUsdcx ?? 0;
  const totalWithdrawn = minerResult?.totalWithdrawn ?? 0;
  const unclaimedSbtc = minerResult?.unclaimedSbtc ?? 0;
  const unclaimedUsdcx = minerResult?.unclaimedUsdcx ?? 0;

  function handleConnect(addr: string) {
    setAddress(addr);
    localStorage.setItem("stx-address", addr);
  }

  function handleDisconnect() {
    setAddress(null);
    localStorage.removeItem("stx-address");
  }

  function handleTx(txId: string) {
    invalidateOnTx(txId);
  }

  const isOngoing = roundData?.state === STATE_ONGOING && (roundData?.blocksRemaining ?? 0) > 0;
  const isCooldown = (
    roundData?.state === STATE_COOLDOWN && (roundData?.cooldownBlocksRemaining ?? 0) > 0
  ) || (
    roundData?.state === STATE_ONGOING && roundData?.blocksRemaining === 0
  );
  const cooldownExpired = roundData?.state === STATE_COOLDOWN && (roundData?.cooldownBlocksRemaining ?? 0) === 0;

  function handleClaimJackpot() {
    if (hasUsdcxInPools) {
      claimMiningRewardDual(handleTx);
    } else {
      claimMiningReward(handleTx);
    }
  }

  return (
    <div className={`app${isCooldown ? " app-cooldown" : ""}`}>
      <Toaster theme="dark" position="top-right" richColors />
      <HashRain />

      <header className="app-header">
        <div className="app-title">
          <h1>Mine A Bitcoin</h1>
          <span className="subtitle"></span>
        </div>
        <div className="header-actions">
          <button
            className="btn btn-sm theme-toggle"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
          >
            {theme === "dark" ? "☀️" : "🌙"}
          </button>
          <ConnectWallet
            address={address}
            onConnect={handleConnect}
            onDisconnect={handleDisconnect}
          />
        </div>
      </header>

      {isCooldown && roundData && (
        <CooldownOverlay
          winner={lastMiner ?? null}
          jackpot={roundData.miningReward}
          jackpotUsdcx={usdcxPools?.miningReward ?? 0}
          round={roundData.round}
          address={address}
          cooldownBlocksRemaining={roundData.cooldownBlocksRemaining}
          onClaimReward={handleClaimJackpot}
        />
      )}

      {/* Hero Stats */}
      {roundData && (
        <section className="hero">
          <div className="hero-tagline">
            {cooldownExpired
              ? "A fresh battlefield awaits. Be the first to buy hashes and ignite the next war."
              : heroTagline(roundData.uniqueMiners, roundData.miningReward, roundData.blocksRemaining)
            }
          </div>
          <div className="hero-stats">
            <div className="hero-stat">
              <div className="hero-stat-value">
                {formatSbtcCompact(roundData.miningReward)} <SbtcIcon size={18} /> / {formatUsdcx(usdcxPools?.miningReward ?? 0)} <UsdcxIcon size={18} />
              </div>
              <div className="hero-stat-label">Reward Pool</div>
            </div>
            <div className="hero-stat">
              <div className="hero-stat-value">{roundData.totalHashes.toLocaleString()} H/s</div>
              <div className="hero-stat-label">Total Hash Rate</div>
            </div>
            <div className="hero-stat">
              <div className="hero-stat-value">{roundData.uniqueMiners}</div>
              <div className="hero-stat-label">Active Miners</div>
            </div>
            <div className="hero-stat">
              <div className="hero-stat-value">{roundData.blocksRemaining}</div>
              <div className="hero-stat-label">Halving after {roundData.blocksRemaining} blocks</div>
            </div>
          </div>
        </section>
      )}

      <div className="section-divider">
        <span>Mining Operations</span>
      </div>

      <main className="app-main">
        <div className="left-col">
          <RoundStatus data={roundData ?? null} sharesStats={sharesStats ?? null} loading={roundLoading} usdcxMiningReward={usdcxPools?.miningReward ?? 0} usdcxMiningShares={usdcxPools?.miningShares ?? 0} />
          <MinerDashboard
            address={address}
            minerData={minerData}
            pendingReward={pendingReward}
            referralEarnings={referralEarnings}
            referralEarningsUsdcx={referralEarningsUsdcx}
            totalWithdrawn={totalWithdrawn}
            unclaimedSbtc={unclaimedSbtc}
            unclaimedUsdcx={unclaimedUsdcx}
            isCooldown={isCooldown ?? false}
            hasUsdcxInPools={hasUsdcxInPools}
            onTx={handleTx}
          />
        </div>
        <div className="right-col">
          <BuyHashes
            address={address}
            gameOngoing={isOngoing ?? false}
            onTx={handleTx}
          />
          <RegisterTag address={address} currentTag={minerTag ?? null} onTx={handleTx} />
        </div>
      </main>

      <footer className="app-footer">
        <p>Powered by <span className="accent">Bitcoin</span> on Stacks</p>
      </footer>
    </div>
  );
}

export default App;
