import { useState, useEffect, useCallback, useMemo } from "react";
import { Toaster } from "sonner";
import "./App.css";
import ConnectWallet from "./components/ConnectWallet";
import RoundStatus from "./components/RoundStatus";
import BuyHashes from "./components/BuyHashes";
import RegisterTag from "./components/RegisterTag";
import MinerDashboard from "./components/MinerDashboard";
import { STATE_ONGOING, STATE_COOLDOWN, formatSbtcCompact } from "./lib/constants";
import {
  getRoundInfo,
  getMinerInfo,
  getMinerTag,
  getPendingReward,
  getReferralEarnings,
  getTotalWithdrawn,
  getSharesStats,
} from "./lib/stacks";

interface RoundData {
  round: number;
  state: number;
  blocksRemaining: number;
  blockOverflow: number;
  totalHashes: number;
  cpuHashes: number;
  gpuHashes: number;
  fpgaHashes: number;
  asicHashes: number;
  miningReward: number;
  miningShares: number;
  uniqueMiners: number;
}

interface SharesStats {
  totalEarned: number;
  totalPaid: number;
  paidLastHour: number;
  paidLastDay: number;
}

interface MinerData {
  hashes: number;
  rig: number;
}

function parseRoundInfo(raw: Record<string, unknown>): RoundData {
  const v = raw.value as Record<string, { value: string | { value: string } | null }>;
  return {
    round: Number(v.round.value),
    state: Number(v.state.value),
    blocksRemaining: Number(v["blocks-remaining"].value),
    blockOverflow: v["block-overflow"] ? Number(v["block-overflow"].value) : 0,
    totalHashes: Number(v["total-hashes"].value),
    cpuHashes: Number(v["cpu-hashes"].value),
    gpuHashes: Number(v["gpu-hashes"].value),
    fpgaHashes: Number(v["fpga-hashes"].value),
    asicHashes: Number(v["asic-hashes"].value),
    miningReward: Number(v["mining-reward"].value),
    miningShares: Number(v["mining-shares"].value),
    uniqueMiners: Number(v["unique-miners"].value),
  };
}

function parseMinerInfo(raw: Record<string, unknown>): MinerData | null {
  console.log("raw miner info:", JSON.stringify(raw));
  if (!raw.value) return null;
  // map-get? returns (optional ...) — cvToJSON wraps as { type: "some", value: { ... } }
  let v = raw.value as Record<string, { value: string }>;
  // If the value itself has a nested "value" (double-wrapped optional), unwrap it
  if (v && typeof v === "object" && "value" in v && !("hashes" in v)) {
    v = v.value as unknown as Record<string, { value: string }>;
  }
  if (!v || !("hashes" in v)) return null;
  return {
    hashes: Number(v.hashes.value),
    rig: Number(v.rig.value),
  };
}

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
  const [roundData, setRoundData] = useState<RoundData | null>(null);
  const [roundLoading, setRoundLoading] = useState(true);
  const [minerData, setMinerData] = useState<MinerData | null>(null);
  const [minerTag, setMinerTag] = useState<string | null>(null);
  const [pendingReward, setPendingReward] = useState(0);
  const [referralEarnings, setReferralEarnings] = useState(0);
  const [totalWithdrawn, setTotalWithdrawn] = useState(0);
  const [sharesStats, setSharesStats] = useState<SharesStats | null>(null);

  const fetchRoundInfo = useCallback(async () => {
    try {
      const [raw, rawStats] = await Promise.all([
        getRoundInfo(),
        getSharesStats(),
      ]);
      setRoundData(parseRoundInfo(raw as Record<string, unknown>));
      const sv = (rawStats as Record<string, unknown>).value as Record<string, { value: string }>;
      if (sv) {
        setSharesStats({
          totalEarned: Number(sv["total-earned"].value),
          totalPaid: Number(sv["total-paid"].value),
          paidLastHour: Number(sv["paid-last-hour"].value),
          paidLastDay: Number(sv["paid-last-day"].value),
        });
      }
    } catch (err) {
      console.error("Failed to fetch round info:", err);
    }
    setRoundLoading(false);
  }, []);

  const fetchMinerTag = useCallback(async () => {
    if (!address) return;
    try {
      const rawTag = await getMinerTag(address);
      console.log("raw miner tag:", JSON.stringify(rawTag));
      const tagRaw = rawTag as Record<string, unknown>;
      let parsedTag: string | null = null;
      if (tagRaw.value) {
        const inner = tagRaw.value;
        if (typeof inner === "string") {
          parsedTag = inner;
        } else if (typeof inner === "object" && inner !== null && "value" in inner) {
          parsedTag = (inner as { value: string }).value;
        }
      }
      setMinerTag(parsedTag);
    } catch (err) {
      console.error("Failed to fetch miner tag:", err);
    }
  }, [address]);

  const fetchMinerData = useCallback(async () => {
    if (!address || !roundData) return;
    try {
      const [rawMiner, rawReward, rawEarnings, rawWithdrawn] = await Promise.all([
        getMinerInfo(address, roundData.round),
        getPendingReward(address),
        getReferralEarnings(address),
        getTotalWithdrawn(address),
      ]);
      setMinerData(parseMinerInfo(rawMiner as Record<string, unknown>));
      setPendingReward(Number((rawReward as { value: string }).value));
      setReferralEarnings(Number((rawEarnings as { value: string }).value));
      setTotalWithdrawn(Number((rawWithdrawn as { value: string }).value));
    } catch (err) {
      console.error("Failed to fetch miner data:", err);
    }
  }, [address, roundData]);

  useEffect(() => {
    fetchRoundInfo();
    const interval = setInterval(fetchRoundInfo, 30_000);
    return () => clearInterval(interval);
  }, [fetchRoundInfo]);

  useEffect(() => {
    fetchMinerTag();
  }, [fetchMinerTag]);

  useEffect(() => {
    fetchMinerData();
  }, [fetchMinerData]);

  function handleConnect(addr: string) {
    setAddress(addr);
    localStorage.setItem("stx-address", addr);
  }

  function handleDisconnect() {
    setAddress(null);
    setMinerData(null);
    setMinerTag(null);
    localStorage.removeItem("stx-address");
  }

  function handleTx(_txId: string) {
    setTimeout(() => {
      fetchRoundInfo();
      fetchMinerTag();
      fetchMinerData();
    }, 3000);
  }

  const isOngoing = roundData?.state === STATE_ONGOING;
  const isCooldown = roundData?.state === STATE_COOLDOWN;

  return (
    <div className="app">
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

      {/* Hero Stats */}
      {roundData && (
        <section className="hero">
          <div className="hero-tagline">
            Buy hashes. Choose your rig. The <strong>last miner standing</strong> wins the pot.
          </div>
          <div className="hero-stats">
            <div className="hero-stat">
              <div className="hero-stat-value">{formatSbtcCompact(roundData.miningReward)}</div>
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
          <RoundStatus data={roundData} sharesStats={sharesStats} loading={roundLoading} />
          <MinerDashboard
            address={address}
            minerData={minerData}
            pendingReward={pendingReward}
            referralEarnings={referralEarnings}
            totalWithdrawn={totalWithdrawn}
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
          <RegisterTag address={address} currentTag={minerTag} onTx={handleTx} />
        </div>
      </main>

      <footer className="app-footer">
        <p>Powered by <span className="accent">Bitcoin</span> on Stacks</p>
      </footer>
    </div>
  );
}

export default App;
