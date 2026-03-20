// Contract constants matching MineABitcoin.clar
export const CONTRACT_ADDRESS = "ST335MJXYFEEYA9KN66VBSB73QQV8CCP5D3C0WKQ3";
export const CONTRACT_NAME = "MineABitcoinBetaV01";
export const SBTC_CONTRACT = "ST1F7QA2MDF17S807EPA36TSS8AMEFY4KA9TVGWXT.sbtc-token";
// Game states
export const STATE_ONGOING = 1;
export const STATE_COOLDOWN = 2;

// Mining rig types
export const RIGS = {
  CPU: { id: 1, label: "CPU", desc: "20% reward, 55% shares, 15% token holders" },
  GPU: { id: 2, label: "GPU", desc: "40% reward, 45% shares, 5% token holders" },
  FPGA: { id: 3, label: "FPGA", desc: "40% reward, 35% shares, 10% token holders" },
  ASIC: { id: 4, label: "ASIC", desc: "35% reward, 50% shares, 5% token holders" },
} as const;

// Pricing constants
export const PRICE_BASE = 547;
export const PRICE_CEILING = 100_000;
export const HASHES_CEILING = 200_000;
export const BLOCKS_PER_ROUND = 1008;
export const MINER_TAG_COST = 10_000;

// sBTC has 8 decimal places (like sBTC)
export const SBTC_DECIMALS = 8;

/**
 * Format a sats value as sBTC (always show as decimal sBTC).
 */
export function formatSbtc(sats: number): string {
  if (sats === 0) return "0";
  const btc = sats / 1e8;
  return btc.toFixed(8);
}

/**
 * Compact format for stat displays (reward pools, etc.)
 * Returns just the number — pair with the sBTC icon.
 */
export function formatSbtcCompact(sats: number): string {
  if (sats === 0) return "0";
  const btc = sats / 1e8;
  if (btc >= 1) return btc.toFixed(4);
  if (btc >= 0.0001) return btc.toFixed(6);
  return btc.toFixed(8);
}

/** @deprecated Use formatSbtc or formatSbtcCompact instead */
export const formatSats = formatSbtcCompact;

export function rigName(id: number): string {
  return Object.values(RIGS).find((r) => r.id === id)?.label ?? "Unknown";
}

/** Dynamic hero tagline based on game state */
export function heroTagline(miners: number, rewardSats: number, blocksRemaining: number): string {
  const btc = rewardSats / 1e8;

  // Pool size drama
  if (btc >= 0.1) {
    if (miners >= 50) return "A war chest worth fighting for. Dozens of miners. Only one walks away with the fortune.";
    if (miners >= 10) return "The pot is swelling. The battlefield is crowded. Will you be the last one standing?";
    return "A massive bounty sits unclaimed. Few dare to enter. The brave will be rewarded.";
  }

  if (btc >= 0.01) {
    if (miners >= 20) return "The stakes are rising and miners are flooding in. Every hash could be your last — or your ticket to glory.";
    if (miners >= 5) return "The reward grows with every miner who dares to enter. Outlast them all.";
    return "A worthy prize builds in the vault. The hunt is on — will you seize it?";
  }

  if (btc >= 0.001) {
    if (miners >= 10) return "The arena fills with challengers. Hash harder, mine smarter, be the last one standing.";
    if (miners >= 3) return "Rivals are circling. The reward pool thickens with every block. Make your move.";
    return "The pot is growing. Early miners have the edge — stake your claim before the rush.";
  }

  // Small pool / early round
  if (miners === 0) {
    if (blocksRemaining < 200) return "The clock is ticking on an empty mine. One bold miner could take it all.";
    return "A fresh round. An empty mine. Be the first to plant your flag and claim the genesis reward.";
  }

  if (miners === 1) return "One lone miner holds the throne. Challenge them — or let them walk away with everything.";
  if (miners === 2) return "Two miners. One prize. The duel has begun.";

  return "The mine is open. Pick your rig. Outlast every miner. The last hash wins.";
}

/** Dramatic era names based on round number */
export function roundEra(round: number): { name: string; title: string } {
  if (round <= 5) return { name: "Genesis", title: "The Genesis Era" };
  if (round <= 15) return { name: "Frontier", title: "The Frontier Rush" };
  if (round <= 30) return { name: "Gold Rush", title: "The Great Gold Rush" };
  if (round <= 50) return { name: "Industrial", title: "The Industrial Age" };
  if (round <= 75) return { name: "Arms Race", title: "The Hash Wars" };
  if (round <= 100) return { name: "Dominion", title: "The Age of Dominion" };
  if (round <= 150) return { name: "Empire", title: "The Empire Rises" };
  if (round <= 200) return { name: "Singularity", title: "The Singularity" };
  return { name: "Eternal", title: "The Eternal Mine" };
}

/**
 * Extract referral code from the URL path.
 * e.g. "https://mydomain.com/ram" → "ram"
 * Returns null if no valid referral code is found.
 */
export function getReferralFromUrl(): string | null {
  const path = window.location.pathname.replace(/^\/+|\/+$/g, "");
  if (!path || path.includes("/")) return null;
  // Validate: 3–24 chars, alphanumeric + underscore/hyphen
  if (/^[a-zA-Z0-9_-]{3,24}$/.test(path)) return path;
  return null;
}
