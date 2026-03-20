import { memo } from "react";
import { formatSbtcCompact, roundEra } from "../lib/constants";
import { SbtcIcon } from "./TokenIcons";

interface Props {
  winner: string | null;
  jackpot: number;
  round: number;
  address: string | null;
  cooldownBlocksRemaining: number;
  onClaimReward: () => void;
}

export default memo(function CooldownOverlay({
  winner,
  jackpot,
  round,
  address,
  cooldownBlocksRemaining,
  onClaimReward,
}: Props) {
  const era = roundEra(round);
  const isWinner = address && winner && address === winner;
  const shortWinner = winner
    ? `${winner.slice(0, 8)}...${winner.slice(-6)}`
    : "Unknown";

  return (
    <div className="cooldown-overlay">
      <div className="cooldown-content">
        <div className="cooldown-flash" />

        <div className="cooldown-badge">ROUND OVER</div>

        <h2 className="cooldown-title">
          {era.title}
        </h2>
        <div className="cooldown-era">The Round Has Ended</div>

        <div className="cooldown-jackpot">
          <span className="cooldown-jackpot-label">Jackpot</span>
          <span className="cooldown-jackpot-value">{formatSbtcCompact(jackpot)} <SbtcIcon size={24} /></span>
        </div>

        <div className="cooldown-winner-section">
          {isWinner ? (
            <>
              <div className="cooldown-you-won">YOU WON</div>
              <p className="cooldown-winner-text">
                You were the <strong>last miner standing</strong>. Claim your reward now.
              </p>
              <button className="btn btn-claim-jackpot" onClick={onClaimReward}>
                Claim {formatSbtcCompact(jackpot)} <SbtcIcon size={18} /> Jackpot
              </button>
            </>
          ) : (
            <>
              <div className="cooldown-winner-label">Winner</div>
              <div className="cooldown-winner-addr">{shortWinner}</div>
              <p className="cooldown-loser-text">
                The last miner standing takes it all. Better luck next round.
              </p>
            </>
          )}
        </div>

        <div className="cooldown-countdown">
          <span className="cooldown-countdown-value">{cooldownBlocksRemaining}</span>
          <span className="cooldown-countdown-label">blocks until next round</span>
        </div>
      </div>
    </div>
  );
});
