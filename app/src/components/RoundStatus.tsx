import { STATE_ONGOING, BLOCKS_PER_ROUND, formatSbtcCompact, rigName } from "../lib/constants";

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

interface Props {
  data: RoundData | null;
  sharesStats: SharesStats | null;
  loading: boolean;
}

const RIG_COLORS: Record<number, string> = {
  1: "var(--green)",
  2: "var(--blue)",
  3: "var(--pink)",
  4: "var(--yellow)",
};

export default function RoundStatus({ data, sharesStats, loading }: Props) {
  if (loading) return <div className="card">Loading round data...</div>;
  if (!data) return <div className="card">Could not load round data</div>;

  const effectiveDuration = BLOCKS_PER_ROUND + data.blockOverflow;
  const progress = ((effectiveDuration - data.blocksRemaining) / effectiveDuration) * 100;
  const isOngoing = data.state === STATE_ONGOING;

  return (
    <div className="card round-status">
      <div className="round-header">
        <h2>Round {data.round}</h2>
        <span className={`badge ${isOngoing ? "badge-ongoing" : "badge-cooldown"}`}>
          {isOngoing ? "Mining" : "Cooldown"}
        </span>
      </div>

      <div className="progress-section">
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>
        <div className="progress-label">
          Halving after {data.blocksRemaining.toLocaleString()} / {effectiveDuration.toLocaleString()} blocks
          {data.blockOverflow > 0 && ` (+${data.blockOverflow} overflow)`}
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat">
          <span className="stat-label">Total Hash Rate</span>
          <span className="stat-value">{data.totalHashes.toLocaleString()} H/s</span>
        </div>
        <div className="stat">
          <span className="stat-label">Miners</span>
          <span className="stat-value">{data.uniqueMiners}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Reward Pool</span>
          <span className="stat-value">{formatSbtcCompact(data.miningReward)}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Mining Pool</span>
          <span className="stat-value">{formatSbtcCompact(data.miningShares)}</span>
        </div>
      </div>

      {sharesStats && (
        <div className="shares-tracking">
          <h3>Mining Shares</h3>
          <div className="stats-grid">
            <div className="stat">
              <span className="stat-label">Total Earned</span>
              <span className="stat-value">{formatSbtcCompact(sharesStats.totalEarned)}</span>
            </div>
            <div className="stat">
              <span className="stat-label">Total Paid</span>
              <span className="stat-value">{formatSbtcCompact(sharesStats.totalPaid)}</span>
            </div>
            <div className="stat">
              <span className="stat-label">Paid (1h)</span>
              <span className="stat-value">{formatSbtcCompact(sharesStats.paidLastHour)}</span>
            </div>
            <div className="stat">
              <span className="stat-label">Paid (24h)</span>
              <span className="stat-value">{formatSbtcCompact(sharesStats.paidLastDay)}</span>
            </div>
          </div>
        </div>
      )}

      <div className="rig-breakdown">
        <h3>Hash Distribution</h3>
        <div className="rig-bars">
          {[
            { id: 1, name: rigName(1), count: data.cpuHashes },
            { id: 2, name: rigName(2), count: data.gpuHashes },
            { id: 3, name: rigName(3), count: data.fpgaHashes },
            { id: 4, name: rigName(4), count: data.asicHashes },
          ].map((rig) => (
            <div key={rig.name} className="rig-row">
              <span className="rig-name" style={{ color: RIG_COLORS[rig.id] }}>{rig.name}</span>
              <div className="rig-bar-bg">
                <div
                  className="rig-bar-fill"
                  style={{
                    width: data.totalHashes > 0 ? `${(rig.count / data.totalHashes) * 100}%` : "0%",
                    backgroundColor: RIG_COLORS[rig.id],
                    color: RIG_COLORS[rig.id],
                  }}
                />
              </div>
              <span className="rig-count">{rig.count.toLocaleString()} H/s</span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
