import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getRoundInfo,
  getSharesStats,
  getLastMiner,
  getMinerTag,
  getMinerInfo,
  getPendingReward,
  getReferralEarnings,
  getTotalWithdrawn,
  getMinerUnclaimedSbtc,
  priceForNHashes,
} from "../lib/stacks";

// ---------- Parsing helpers ----------

interface RoundData {
  round: number;
  state: number;
  blocksRemaining: number;
  blocksElapsed: number;
  blockOverflow: number;
  roundStartHeight: number;
  currentBlockHeight: number;
  totalHashes: number;
  cpuHashes: number;
  gpuHashes: number;
  fpgaHashes: number;
  asicHashes: number;
  miningReward: number;
  miningShares: number;
  uniqueMiners: number;
  cooldownBlocksRemaining: number;
  effectiveDuration: number;
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
    blocksElapsed: Number(v["blocks-elapsed"].value),
    blockOverflow: v["block-overflow"] ? Number(v["block-overflow"].value) : 0,
    roundStartHeight: Number(v["round-start-height"].value),
    currentBlockHeight: Number(v["current-block-height"].value),
    totalHashes: Number(v["total-hashes"].value),
    cpuHashes: Number(v["cpu-hashes"].value),
    gpuHashes: Number(v["gpu-hashes"].value),
    fpgaHashes: Number(v["fpga-hashes"].value),
    asicHashes: Number(v["asic-hashes"].value),
    miningReward: Number(v["mining-reward"].value),
    miningShares: Number(v["mining-shares"].value),
    uniqueMiners: Number(v["unique-miners"].value),
    cooldownBlocksRemaining: v["cooldown-blocks-remaining"] ? Number(v["cooldown-blocks-remaining"].value) : 0,
    effectiveDuration: v["effective-duration"] ? Number(v["effective-duration"].value) : 0,
  };
}

function parseMinerInfo(raw: Record<string, unknown>): MinerData | null {
  if (!raw.value) return null;
  let v = raw.value as Record<string, { value: string }>;
  if (v && typeof v === "object" && "value" in v && !("hashes" in v)) {
    v = v.value as unknown as Record<string, { value: string }>;
  }
  if (!v || !("hashes" in v)) return null;
  return {
    hashes: Number(v.hashes.value),
    rig: Number(v.rig.value),
  };
}

// ---------- Query hooks ----------

export function useRoundInfo() {
  return useQuery({
    queryKey: ["roundInfo"],
    queryFn: async () => {
      const raw = await getRoundInfo();
      return parseRoundInfo(raw as Record<string, unknown>);
    },
  });
}

export function useSharesStats() {
  return useQuery({
    queryKey: ["sharesStats"],
    queryFn: async () => {
      const raw = await getSharesStats();
      const sv = (raw as Record<string, unknown>).value as Record<string, { value: string }>;
      if (!sv) return null;
      return {
        totalEarned: Number(sv["total-earned"].value),
        totalPaid: Number(sv["total-paid"].value),
        paidLastHour: Number(sv["paid-last-hour"].value),
        paidLastDay: Number(sv["paid-last-day"].value),
      } as SharesStats;
    },
  });
}

export function useLastMiner() {
  return useQuery({
    queryKey: ["lastMiner"],
    queryFn: async () => {
      const raw = await getLastMiner();
      const lm = raw as Record<string, unknown>;
      if (lm.value && typeof lm.value === "object" && lm.value !== null && "value" in lm.value) {
        return String((lm.value as { value: string }).value);
      }
      if (lm.value && typeof lm.value === "string") {
        return lm.value;
      }
      return null;
    },
  });
}

export function useMinerTag(address: string | null) {
  return useQuery({
    queryKey: ["minerTag", address],
    queryFn: async () => {
      const rawTag = await getMinerTag(address!);
      const tagRaw = rawTag as Record<string, unknown>;
      if (tagRaw.value) {
        const inner = tagRaw.value;
        if (typeof inner === "string") return inner;
        if (typeof inner === "object" && inner !== null && "value" in inner) {
          return (inner as { value: string }).value;
        }
      }
      return null;
    },
    enabled: !!address,
  });
}

export function useMinerData(address: string | null, round: number | undefined) {
  return useQuery({
    queryKey: ["minerData", address, round],
    queryFn: async () => {
      const [rawMiner, rawReward, rawEarnings, rawWithdrawn, rawUnclaimedSbtc] = await Promise.all([
        getMinerInfo(address!, round!),
        getPendingReward(address!),
        getReferralEarnings(address!),
        getTotalWithdrawn(address!),
        getMinerUnclaimedSbtc(address!),
      ]);
      return {
        minerData: parseMinerInfo(rawMiner as Record<string, unknown>),
        pendingReward: Number((rawReward as { value: string }).value),
        referralEarnings: Number((rawEarnings as { value: string }).value),
        totalWithdrawn: Number((rawWithdrawn as { value: string }).value),
        unclaimedSbtc: Number((rawUnclaimedSbtc as { value: string }).value),
      };
    },
    enabled: !!address && round !== undefined,
  });
}

export function useHashQuote(hashAmount: number) {
  return useQuery({
    queryKey: ["hashQuote", hashAmount],
    queryFn: async () => {
      const result = await priceForNHashes(hashAmount);
      return Number(result.value);
    },
    enabled: hashAmount > 0,
    refetchInterval: false,
    staleTime: 10_000,
  });
}

/** Invalidate all queries after a transaction */
export function useInvalidateOnTx() {
  const queryClient = useQueryClient();
  return (txId: string) => {
    setTimeout(() => {
      queryClient.invalidateQueries();
    }, 3000);
    return txId;
  };
}

export type { RoundData, SharesStats, MinerData };
