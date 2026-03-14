# Mine A Bitcoin

A FOMO-fueled Bitcoin mining game on Stacks.

Every round, miners buy hashes with Bitcoin. Prices start cheap and climb through four phases, ending at a hard ceiling. The catch: the **last miner to buy hashes before blocks run out wins the entire reward pot**. Every hash you buy resets the countdown, keeping everyone on edge.

Walk away and someone else takes the pot. Buy in too late and you overpay. Don't buy at all and you watch the pool grow without you. The game is simple, the pressure isn't.

Choose your rig -- CPU, GPU, FPGA, or ASIC -- each splitting rewards differently between the winner, the mining pool, and token holders. Refer friends and earn a cut of every deposit they make, forever.

Rounds repeat. Pots grow. The clock always ticks.

### How It Works

1. **Buy Hashes** -- Spend BTC to purchase hash power. Prices follow a 4-phase curve: starts cheap, ramps up, then hits a ceiling at 100k sats.
2. **Pick a Rig** -- Each rig splits your deposit differently between the reward pot, mining shares pool, and token holders.
3. **Last Miner Wins** -- When blocks run out, the last player to buy hashes claims the reward pot.
4. **Earn Shares** -- Even if you don't win, your hashes earn proportional mining shares from every deposit in the round.
5. **Refer & Earn** -- Share your referral link. Earn 7% of every deposit your referrals make, permanently.

### Mining Rigs

| Rig | Reward | Shares | Token Holders |
|------|--------|--------|---------------|
| CPU | 20% | 55% | 15% |
| GPU | 40% | 45% | 5% |
| FPGA | 40% | 35% | 10% |
| ASIC | 35% | 50% | 5% |

### Architecture

- **Smart Contract** -- `contracts/MineABitcoin.clar` (Clarity v4). Handles pricing, round lifecycle, rig splits, referral tracking, and reward distribution on-chain.
- **Frontend** -- `app/` (React + Vite + TypeScript). Real-time dashboard, hash purchasing, wallet integration (Leather, Xverse), dark/light themes.
- **Tests** -- Clarinet SDK + Vitest. Full coverage of pricing phases, round transitions, edge cases, and payout calculations.

### Getting Started

```bash
# Smart contract tests
npm install
npm test

# Frontend
cd app
pnpm install
pnpm dev
```

### Roadmap

- **Freebie Mode** -- A free-to-play path where users complete tasks (social shares, quizzes, daily check-ins) to earn hashes without spending Bitcoin. Lower the barrier, grow the player base.
- **Leaderboards** -- Global and per-round rankings for top miners, biggest pots won, and referral earners.
- **Mining Guilds** -- Pool resources with other players, share strategies, and split rewards as a group.
- **Achievement System** -- Unlock badges for milestones like first win, 100 rounds played, or referring 10 miners.
- **Mobile App** -- Native mobile experience for mining on the go.
