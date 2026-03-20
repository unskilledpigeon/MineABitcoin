import { memo } from "react";
import { formatSbtcCompact, rigName } from "../lib/constants";
import { SbtcIcon } from "./TokenIcons";
import { claimMiningShares, claimMiningReward, claimUnclaimedSbtc } from "../lib/stacks";

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
  unclaimedSbtc: number;
  isCooldown: boolean;
  onTx: (txId: string) => void;
}

const RIG_COLORS: Record<number, string> = {
  1: "var(--green)",
  2: "var(--blue)",
  3: "var(--pink)",
  4: "var(--yellow)",
};

export default memo(function MinerDashboard({
  address,
  minerData,
  pendingReward,
  referralEarnings,
  totalWithdrawn,
  unclaimedSbtc,
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
                {minerData ? rigName(minerData.rig) : "\u2014"}
              </td>
            </tr>
            <tr>
              <td className="earnings-label">Fee Earned</td>
              <td className="earnings-value">{formatSbtcCompact(pendingReward)} <SbtcIcon /></td>
            </tr>
            <tr>
              <td className="earnings-label">Referral Earnings</td>
              <td className="earnings-value">{formatSbtcCompact(referralEarnings)} <SbtcIcon /></td>
            </tr>
            <tr>
              <td className="earnings-label">Total Withdrawn</td>
              <td className="earnings-value">{formatSbtcCompact(totalWithdrawn)} <SbtcIcon /></td>
            </tr>
            {unclaimedSbtc > 0 && (
              <tr>
                <td className="earnings-label">Unclaimed sBTC</td>
                <td className="earnings-value">{formatSbtcCompact(unclaimedSbtc)} <SbtcIcon /></td>
              </tr>
            )}
          </tbody>
        </table>

        {connected && (
          <div className="actions">
            {pendingReward > 0 && (
              <button className="btn btn-action" onClick={() => claimMiningShares(onTx)}>
                Claim {formatSbtcCompact(pendingReward)} <SbtcIcon />
              </button>
            )}
            {unclaimedSbtc > 0 && (
              <button className="btn btn-action" onClick={() => claimUnclaimedSbtc(onTx)}>
                Claim {formatSbtcCompact(unclaimedSbtc)} <SbtcIcon />
              </button>
            )}
            {isCooldown && (
              <button className="btn btn-winner" onClick={() => claimMiningReward(onTx)}>
                Claim Mining Reward
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
});
