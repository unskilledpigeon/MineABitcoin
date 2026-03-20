import "./HowToPlay.css";

interface Props {
  onBack: () => void;
}

const RIGS = [
  {
    name: "CPU",
    tagline: "Humble but honest",
    color: "var(--green)",
    jackpot: 20,
    shares: 55,
    holders: 15,
    other: 10,
  },
  {
    name: "GPU",
    tagline: "Parallel power",
    color: "var(--blue)",
    jackpot: 40,
    shares: 45,
    holders: 5,
    other: 10,
  },
  {
    name: "FPGA",
    tagline: "Programmable fury",
    color: "var(--pink)",
    jackpot: 40,
    shares: 35,
    holders: 10,
    other: 15,
  },
  {
    name: "ASIC",
    tagline: "Industrial dominance",
    color: "var(--yellow)",
    jackpot: 35,
    shares: 50,
    holders: 5,
    other: 10,
  },
];

const WIN_SPLITS = [
  { name: "CPU",  color: "var(--green)",  holders: 30, shares: 50, nextRound: 20 },
  { name: "GPU",  color: "var(--blue)",   holders: 10, shares: 60, nextRound: 30 },
  { name: "FPGA", color: "var(--pink)",   holders: 20, shares: 40, nextRound: 40 },
  { name: "ASIC", color: "var(--yellow)", holders: 10, shares: 50, nextRound: 40 },
];

export default function HowToPlay({ onBack }: Props) {
  return (
    <div className="htp-page">
      {/* Back button */}
      <button className="htp-back" onClick={onBack}>
        <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="7,2 3,6 7,10" />
          <line x1="3" y1="6" x2="11" y2="6" />
        </svg>
        Back to Game
      </button>

      {/* Hero */}
      <div className="htp-hero">
        <div className="htp-hero-eyebrow">⛏ Field Manual</div>
        <h1>How to <span>Mine A Bitcoin</span></h1>
        <p className="htp-hero-sub">
          A last-miner-standing game on Bitcoin. Buy hashes, outlast everyone, claim the jackpot.
          Every satoshi you spend is split on-chain — no middlemen, no surprises.
        </p>
      </div>

      {/* ── Section 1: Game Loop ── */}
      <div className="htp-section">
        <div className="htp-card">
          <div className="htp-section-header">
            <span className="htp-section-num">01</span>
            <h2 className="htp-section-title">How to Play</h2>
          </div>

          <div className="htp-loop">
            <div className="htp-step">
              <div className="htp-step-num">1</div>
              <div>
                <div className="htp-step-title">Round Opens</div>
                <p className="htp-step-desc">
                  A new round starts automatically. It runs for{" "}
                  <strong>~7 days</strong> (1,008 Bitcoin blocks). A starting
                  pot is seeded from the previous round.
                </p>
              </div>
            </div>

            <div className="htp-step">
              <div className="htp-step-num">2</div>
              <div>
                <div className="htp-step-title">Buy Hashes</div>
                <p className="htp-step-desc">
                  Spend <strong>sBTC</strong> to buy hashes. Pick your rig.
                  Each purchase makes you the <strong>last miner</strong> and
                  grows the jackpot.
                </p>
              </div>
            </div>

            <div className="htp-step">
              <div className="htp-step-num">3</div>
              <div>
                <div className="htp-step-title">Hold the Spot</div>
                <p className="htp-step-desc">
                  If someone buys after you, they take the "last miner" slot.
                  You earn <strong>shares</strong> proportional to your hashes
                  every block — even if you lose.
                </p>
              </div>
            </div>

            <div className="htp-step">
              <div className="htp-step-num">4</div>
              <div>
                <div className="htp-step-title">Win the Jackpot</div>
                <p className="htp-step-desc">
                  When the timer hits zero, the <strong>last miner standing</strong>{" "}
                  wins 48% of the entire jackpot pool. The rest is distributed
                  by rig type.
                </p>
              </div>
            </div>
          </div>

          {/* Price range bar */}
          <div className="htp-price-range">
            <span className="htp-price-label">Price per hash</span>
            <span className="htp-price-start">547 sats</span>
            <div className="htp-price-arrow" />
            <span className="htp-price-end">100,000 sats</span>
            <span className="htp-price-label">rises as pool fills</span>
          </div>
        </div>
      </div>

      {/* ── Section 2: Rig Distribution ── */}
      <div className="htp-section">
        <div className="htp-card">
          <div className="htp-section-header">
            <span className="htp-section-num">02</span>
            <h2 className="htp-section-title">Rigs & Purchase Distribution</h2>
          </div>

          <div className="htp-rigs">
            {RIGS.map((rig) => (
              <div key={rig.name} className="htp-rig-row">
                <div className="htp-rig-meta">
                  <div className="htp-rig-dot" style={{ background: rig.color, boxShadow: `0 0 8px ${rig.color}` }} />
                  <span className="htp-rig-name" style={{ color: rig.color }}>{rig.name}</span>
                  <span className="htp-rig-tagline">{rig.tagline}</span>
                </div>

                {/* Stacked bar */}
                <div className="htp-bar-wrap">
                  <div
                    className="htp-bar-seg"
                    style={{ width: `${rig.jackpot}%`, background: "var(--accent)" }}
                    title={`Jackpot: ${rig.jackpot}%`}
                  />
                  <div
                    className="htp-bar-seg"
                    style={{ width: `${rig.shares}%`, background: "var(--blue)" }}
                    title={`Shares: ${rig.shares}%`}
                  />
                  <div
                    className="htp-bar-seg"
                    style={{ width: `${rig.holders}%`, background: "var(--green)" }}
                    title={`Token Holders: ${rig.holders}%`}
                  />
                  <div
                    className="htp-bar-seg"
                    style={{ width: `${rig.other}%`, background: "rgba(255,255,255,0.12)" }}
                    title={`Fees & Protocol: ${rig.other}%`}
                  />
                </div>

                <div className="htp-bar-legend">
                  <div className="htp-legend-item">
                    <div className="htp-legend-dot" style={{ background: "var(--accent)" }} />
                    Jackpot <span className="htp-legend-pct">{rig.jackpot}%</span>
                  </div>
                  <div className="htp-legend-item">
                    <div className="htp-legend-dot" style={{ background: "var(--blue)" }} />
                    Shares Pool <span className="htp-legend-pct">{rig.shares}%</span>
                  </div>
                  <div className="htp-legend-item">
                    <div className="htp-legend-dot" style={{ background: "var(--green)" }} />
                    Token Holders <span className="htp-legend-pct">{rig.holders}%</span>
                  </div>
                  <div className="htp-legend-item">
                    <div className="htp-legend-dot" style={{ background: "rgba(255,255,255,0.2)" }} />
                    Fees &amp; Protocol <span className="htp-legend-pct">{rig.other}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Fees breakdown */}
          <div className="htp-fees-note">
            <span className="htp-fees-note-icon">ℹ</span>
            <div>
              The <strong>"Fees &amp; Protocol"</strong> slice is split between:
              <div className="htp-fees-chips">
                <span className="htp-chip htp-chip-referrer">7% Referrer (if referred)</span>
                <span className="htp-chip htp-chip-hunt">0.8% Free Hunt Pool</span>
                <span className="htp-chip htp-chip-next">0.2% Next Round Seed</span>
                <span className="htp-chip htp-chip-airdrop">1% Airdrop Pool</span>
                <span className="htp-chip htp-chip-airdrop">Dev (remainder)</span>
              </div>
              If you weren't referred, the referrer slice goes to the dev pool instead.
            </div>
          </div>
        </div>
      </div>

      {/* ── Section 3: Winning Split ── */}
      <div className="htp-section">
        <div className="htp-card">
          <div className="htp-section-header">
            <span className="htp-section-num">03</span>
            <h2 className="htp-section-title">Winning Split</h2>
          </div>

          <div className="htp-win-grid">
            {WIN_SPLITS.map((w) => (
              <div key={w.name} className="htp-win-card" style={{ borderColor: `color-mix(in srgb, ${w.color} 25%, var(--border))` }}>
                <div className="htp-win-rig-header">
                  <div className="htp-rig-dot" style={{ background: w.color, boxShadow: `0 0 6px ${w.color}` }} />
                  <span className="htp-win-rig-name" style={{ color: w.color }}>{w.name} Winner</span>
                </div>

                <div className="htp-winner-pct">
                  <div className="htp-winner-pct-num">48%</div>
                  <div className="htp-winner-pct-label">goes directly to you</div>
                </div>

                <div className="htp-remainder-label">Remaining 52% split:</div>
                <div className="htp-remainder-rows">
                  <div className="htp-rem-row">
                    <span className="htp-rem-label">Shares Pool</span>
                    <div className="htp-rem-bar-bg">
                      <div className="htp-rem-bar-fill" style={{ width: `${w.shares}%`, background: "var(--blue)" }} />
                    </div>
                    <span className="htp-rem-pct" style={{ color: "var(--blue)" }}>{w.shares}%</span>
                  </div>
                  <div className="htp-rem-row">
                    <span className="htp-rem-label">Token Holders</span>
                    <div className="htp-rem-bar-bg">
                      <div className="htp-rem-bar-fill" style={{ width: `${w.holders}%`, background: "var(--green)" }} />
                    </div>
                    <span className="htp-rem-pct" style={{ color: "var(--green)" }}>{w.holders}%</span>
                  </div>
                  <div className="htp-rem-row">
                    <span className="htp-rem-label">Next Round</span>
                    <div className="htp-rem-bar-bg">
                      <div className="htp-rem-bar-fill" style={{ width: `${w.nextRound}%`, background: "var(--accent)" }} />
                    </div>
                    <span className="htp-rem-pct" style={{ color: "var(--accent)" }}>{w.nextRound}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="htp-win-note">
            <strong>Strategy tip:</strong> GPU and FPGA winners push more into the Next Round pot (30–40%),
            growing the jackpot for the next round. CPU winners share more with Token Holders (30%).
            Your rig choice affects not just your buy split — it shapes the entire round's economy.
          </div>
        </div>
      </div>

      {/* ── Section 4: Referral ── */}
      <div className="htp-section">
        <div className="htp-card">
          <div className="htp-section-header">
            <span className="htp-section-num">04</span>
            <h2 className="htp-section-title">Referral System</h2>
          </div>

          <div className="htp-referral-grid">
            <div className="htp-ref-block">
              <div className="htp-ref-step-num">Step 01</div>
              <div className="htp-ref-title">Register Your Tag</div>
              <p className="htp-ref-desc">
                Pick a unique handle — 3 to 24 characters, alphanumeric.
                Registration costs <strong className="accent">10,000 sats</strong> of sBTC,
                paid once. Your tag is yours permanently.
              </p>
              <div className="htp-ref-url">
                mineabitcoin.xyz/<span>your-tag</span>
              </div>
            </div>

            <div className="htp-ref-block">
              <div className="htp-ref-step-num">Step 02</div>
              <div className="htp-ref-title">Share Your Link</div>
              <p className="htp-ref-desc">
                Send your referral URL to anyone. When they visit and buy hashes,
                they're automatically linked to you — <strong>forever</strong>, not just for one purchase.
              </p>
            </div>

            <div className="htp-ref-block">
              <div className="htp-ref-step-num">Step 03</div>
              <div className="htp-ref-title">Earn On Every Buy</div>
              <div className="htp-earning-pct">
                <span className="htp-earning-pct-num">7%</span>
                <span className="htp-earning-pct-label">&nbsp;of every purchase they make</span>
              </div>
              <p className="htp-ref-desc" style={{ marginTop: "0.5rem" }}>
                Paid <span className="green">instantly on-chain</span> at the moment of their purchase.
                No claim needed — it lands in your balance automatically.
              </p>
            </div>

            <div className="htp-ref-block">
              <div className="htp-ref-step-num">Track It</div>
              <div className="htp-ref-title">Your Earnings Dashboard</div>
              <p className="htp-ref-desc">
                All referral earnings are visible in the <strong>Your Earnings</strong> panel.
                The <strong>Referral Earnings</strong> row shows your lifetime total paid out directly on-chain.
                No middleman. No withdrawal delays.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
