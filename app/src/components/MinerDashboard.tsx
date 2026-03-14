import { formatSbtcCompact, rigName } from "../lib/constants";
import { claimMiningShares, claimMiningReward, startNewRound } from "../lib/stacks";

interface MinerData {
  hashes: number;
  rig: number;
}

interface Props {
  address: string | null;
  minerData: MinerData | null;
  pendingReward: number;
  referralEarnings: number;
  totalWithdrawn: number;
  isCooldown: boolean;
  onTx: (txId: string) => void;
}

const RIG_COLORS: Record<number, string> = {
  1: "var(--green)",
  2: "var(--blue)",
  3: "var(--pink)",
  4: "var(--yellow)",
};

export default function MinerDashboard({
  address,
  minerData,
  pendingReward,
  referralEarnings,
  totalWithdrawn,
  isCooldown,
  onTx,
}: Props) {
  const connected = !!address;

  return (
    <div className="card miner-dashboard">
      <h2>Your Earnings</h2>

      <div className={`earnings-content${connected ? "" : " earnings-blurred"}`}>
        <table className="earnings-table">
          <tbody>
            <tr>
              <td className="earnings-label">Your Hash Rate</td>
              <td className="earnings-value">{minerData ? `${minerData.hashes.toLocaleString()} H/s` : "0 H/s"}</td>
            </tr>
            <tr>
              <td className="earnings-label">Last Rig</td>
              <td className="earnings-value" style={minerData ? { color: RIG_COLORS[minerData.rig] } : undefined}>
                {minerData ? rigName(minerData.rig) : "—"}
              </td>
            </tr>
            <tr>
              <td className="earnings-label">Fee Earned</td>
              <td className="earnings-value">{formatSbtcCompact(pendingReward)}</td>
            </tr>
            <tr>
              <td className="earnings-label">Referral Earnings</td>
              <td className="earnings-value">{formatSbtcCompact(referralEarnings)}</td>
            </tr>
            <tr>
              <td className="earnings-label">Total Withdrawn</td>
              <td className="earnings-value">{formatSbtcCompact(totalWithdrawn)}</td>
            </tr>
          </tbody>
        </table>

        {connected && (
          <div className="actions">
            {pendingReward > 0 && (
              <button className="btn btn-action" onClick={() => claimMiningShares(onTx)}>
                Claim Reward ({formatSbtcCompact(pendingReward)})
              </button>
            )}
            {isCooldown && (
              <button className="btn btn-winner" onClick={() => claimMiningReward(onTx)}>
                Claim Mining Reward
              </button>
            )}
            {isCooldown && (
              <button className="btn btn-action" onClick={() => startNewRound(onTx)}>
                Start New Round
              </button>
            )}
          </div>
        )}
      </div>

      {!connected && (
        <div className="earnings-overlay">
          <span className="earnings-overlay-label">Connect your wallet to view earnings</span>
        </div>
      )}
    </div>
  );
}
