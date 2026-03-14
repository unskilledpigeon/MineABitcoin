// Contract constants matching MineABitcoin.clar
export const CONTRACT_ADDRESS = "ST2PK83E969198SKZJ5GJW7V7813W5VASM7A54B7K";
export const CONTRACT_NAME = "MineABitcoinV5000";
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

// sBTC has 8 decimal places (like BTC)
export const SBTC_DECIMALS = 8;

/**
 * Format a sats value as BTC (always show as decimal BTC).
 */
export function formatSbtc(sats: number): string {
  if (sats === 0) return "0 BTC";
  const btc = sats / 1e8;
  return `${btc.toFixed(8)} BTC`;
}

/**
 * Compact format for stat displays (reward pools, etc.)
 * Always displays as BTC decimal.
 */
export function formatSbtcCompact(sats: number): string {
  if (sats === 0) return "0 BTC";
  const btc = sats / 1e8;
  // Show enough decimal places to be meaningful
  if (btc >= 1) return `${btc.toFixed(4)} BTC`;
  if (btc >= 0.0001) return `${btc.toFixed(6)} BTC`;
  return `${btc.toFixed(8)} BTC`;
}

/** @deprecated Use formatSbtc or formatSbtcCompact instead */
export const formatSats = formatSbtcCompact;

export function rigName(id: number): string {
  return Object.values(RIGS).find((r) => r.id === id)?.label ?? "Unknown";
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
