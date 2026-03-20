import { useState, useEffect, useMemo, useCallback } from "react";
import { Toaster } from "sonner";
import "./App.css";
import ConnectWallet from "./components/ConnectWallet";
import RoundStatus from "./components/RoundStatus";
import BuyHashes from "./components/BuyHashes";
import RegisterTag from "./components/RegisterTag";
import MinerDashboard from "./components/MinerDashboard";
import CooldownOverlay from "./components/CooldownOverlay";
import { SbtcIcon } from "./components/TokenIcons";
import { formatSbtcCompact, heroTagline } from "./lib/constants";
import { claimMiningReward } from "./lib/stacks";
import {
  useRoundInfo,
  useSharesStats,
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
  const { data: lastMiner } = useLastMiner();
  const { data: minerTag } = useMinerTag(address);
  const { data: minerResult } = useMinerData(address, roundData?.round);
  const invalidateOnTx = useInvalidateOnTx();

  const minerData = minerResult?.minerData ?? null;
  const pendingReward = minerResult?.pendingReward ?? 0;
  const referralEarnings = minerResult?.referralEarnings ?? 0;
  const totalWithdrawn = minerResult?.totalWithdrawn ?? 0;
  const unclaimedSbtc = minerResult?.unclaimedSbtc ?? 0;

  const handleConnect = useCallback((addr: string) => {
    setAddress(addr);
    localStorage.setItem("stx-address", addr);
  }, []);

  const handleDisconnect = useCallback(() => {
    setAddress(null);
    localStorage.removeItem("stx-address");
  }, []);

  const handleTx = useCallback((txId: string) => {
    invalidateOnTx(txId);
  }, [invalidateOnTx]);

  const tagline = useMemo(() =>
    roundData
      ? heroTagline(roundData.uniqueMiners, roundData.miningReward, roundData.blocksRemaining)
      : "",
  [roundData]);

  const { isOngoing, isCooldown, cooldownExpired } = useMemo(() => ({
    isOngoing: roundData?.state === STATE_ONGOING && (roundData?.blocksRemaining ?? 0) > 0,
    isCooldown: (
      roundData?.state === STATE_COOLDOWN && (roundData?.cooldownBlocksRemaining ?? 0) > 0
    ) || (
      roundData?.state === STATE_ONGOING && roundData?.blocksRemaining === 0
    ),
    cooldownExpired: roundData?.state === STATE_COOLDOWN && (roundData?.cooldownBlocksRemaining ?? 0) === 0,
  }), [roundData]);

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
          round={roundData.round}
          address={address}
          cooldownBlocksRemaining={roundData.cooldownBlocksRemaining}
          onClaimReward={() => claimMiningReward(handleTx)}
        />
      )}

      {/* Hero Stats */}
      {roundData && (
        <section className="hero">
          <div className="hero-tagline">
            {cooldownExpired
              ? "A fresh battlefield awaits. Be the first to buy hashes and ignite the next war."
              : tagline
            }
          </div>
          <div className="hero-stats">
            <div className="hero-stat">
              <div className="hero-stat-value">
                {formatSbtcCompact(roundData.miningReward)} <SbtcIcon size={18} />
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
          <RoundStatus data={roundData ?? null} sharesStats={sharesStats ?? null} loading={roundLoading} />
          <MinerDashboard
            address={address}
            minerData={minerData}
            pendingReward={pendingReward}
            referralEarnings={referralEarnings}
            totalWithdrawn={totalWithdrawn}
            unclaimedSbtc={unclaimedSbtc}
            isCooldown={isCooldown ?? false}
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
