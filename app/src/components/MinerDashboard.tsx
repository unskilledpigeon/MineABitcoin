import { formatSbtcCompact, formatUsdcx, rigName } from "../lib/constants";
import { SbtcIcon, UsdcxIcon } from "./TokenIcons";
import { claimMiningShares, claimMiningSharesDual, claimMiningReward, claimMiningRewardDual, claimUnclaimedSbtc, claimUnclaimedUsdcx } from "../lib/stacks";

interface MinerData {
  hashes: number;
  rig: number;
}

interface Props {
  address: string | null;
  minerData: MinerData | null;
  pendingReward: number;
  referralEarnings: number;
  referralEarningsUsdcx: number;
  totalWithdrawn: number;
  unclaimedSbtc: number;
  unclaimedUsdcx: number;
  isCooldown: boolean;
  hasUsdcxInPools: boolean;
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
  referralEarningsUsdcx,
  totalWithdrawn,
  unclaimedSbtc,
  unclaimedUsdcx,
  isCooldown,
  hasUsdcxInPools,
  onTx,
}: Props) {
  const connected = !!address;

  function handleClaimShares() {
    if (hasUsdcxInPools) {
      claimMiningSharesDual(onTx);
    } else {
      claimMiningShares(onTx);
    }
  }

  function handleClaimReward() {
    if (hasUsdcxInPools) {
      claimMiningRewardDual(onTx);
    } else {
      claimMiningReward(onTx);
    }
  }

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
              <td className="earnings-value">{formatSbtcCompact(referralEarnings)} <SbtcIcon /> / {formatUsdcx(referralEarningsUsdcx)} <UsdcxIcon /></td>
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
            {unclaimedUsdcx > 0 && (
              <tr>
                <td className="earnings-label">Unclaimed USDCx</td>
                <td className="earnings-value">{formatUsdcx(unclaimedUsdcx)} <UsdcxIcon /></td>
              </tr>
            )}
          </tbody>
        </table>

        {connected && (
          <div className="actions">
            {pendingReward > 0 && (
              <button className="btn btn-action" onClick={handleClaimShares}>
                Claim {formatSbtcCompact(pendingReward)} <SbtcIcon />{hasUsdcxInPools && <> + <UsdcxIcon /></>}
              </button>
            )}
            {unclaimedSbtc > 0 && (
              <button className="btn btn-action" onClick={() => claimUnclaimedSbtc(onTx)}>
                Claim {formatSbtcCompact(unclaimedSbtc)} <SbtcIcon />
              </button>
            )}
            {unclaimedUsdcx > 0 && (
              <button className="btn btn-action" onClick={() => claimUnclaimedUsdcx(onTx)}>
                Claim {formatUsdcx(unclaimedUsdcx)} <UsdcxIcon />
              </button>
            )}
            {isCooldown && (
              <button className="btn btn-winner" onClick={handleClaimReward}>
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
}
