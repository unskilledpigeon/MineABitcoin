import { request } from "@stacks/connect";
import {
  uintCV,
  stringAsciiCV,
  contractPrincipalCV,
  principalCV,
  Cl,
  fetchCallReadOnlyFunction,
  cvToJSON,
  type ClarityValue,
} from "@stacks/transactions";
import { toast } from "sonner";
import { CONTRACT_ADDRESS, CONTRACT_NAME, SBTC_CONTRACT } from "./constants";

const network = "testnet";
const contractId = `${CONTRACT_ADDRESS}.${CONTRACT_NAME}` as const;
const EXPLORER_URL = "https://explorer.hiro.so/txid";

const CONTRACT_ERRORS: Record<number, string> = {
  1000: "Not authorized",
  1001: "Game is not ongoing",
  1002: "Game is not in cooldown",
  1003: "Invalid rig type",
  1004: "Hash amount must be greater than zero",
  1005: "Miner tag already taken",
  1006: "Tag too short (min 3 chars)",
  1007: "Tag too long (max 24 chars)",
  1008: "Already registered",
  1009: "Reserved tag",
  1011: "Insufficient payment — price moved, try again",
  1013: "No reward to claim",
  1014: "Not the round winner",
  1015: "Overflow error",
  1016: "Invalid token",
  1017: "Round has ended",
  1018: "Invalid value",
};

function parseContractError(repr: string): string {
  const match = repr.match(/\(err u(\d+)\)/);
  if (match) {
    const code = Number(match[1]);
    return CONTRACT_ERRORS[code] ?? `Contract error u${code}`;
  }
  return repr;
}

function txAction(txid: string) {
  return {
    label: "View",
    onClick: () => window.open(`${EXPLORER_URL}/${txid}?chain=testnet`, "_blank"),
  };
}

/** Show a loading toast and poll until the tx is confirmed, then update to success/error. */
function watchTx(txid: string, pendingMsg: string, successMsg: string) {
  const toastId = toast.loading(pendingMsg, {
    description: `TX: ${txid.slice(0, 16)}...`,
    action: txAction(txid),
  });

  const maxAttempts = 72; // ~6 min at 5s interval
  let attempt = 0;

  async function poll() {
    if (attempt >= maxAttempts) {
      toast.warning("Transaction still pending — check the explorer", {
        id: toastId,
        description: `TX: ${txid.slice(0, 16)}...`,
        action: txAction(txid),
        duration: 10000,
      });
      return;
    }
    attempt++;
    try {
      const res = await fetch(`${apiUrl}/extended/v1/tx/${txid}`);
      const data = await res.json();
      if (data.tx_status === "success") {
        toast.success(successMsg, {
          id: toastId,
          description: `TX: ${txid.slice(0, 16)}...`,
          action: txAction(txid),
          duration: 8000,
        });
        return;
      }
      if (data.tx_status === "abort_by_response" || data.tx_status === "abort_by_post_condition") {
        const reason = data.tx_result?.repr
          ? parseContractError(data.tx_result.repr)
          : "Transaction aborted";
        toast.error("Transaction failed", {
          id: toastId,
          description: reason,
          action: txAction(txid),
          duration: 12000,
        });
        return;
      }
      // still pending
      setTimeout(poll, 5000);
    } catch {
      setTimeout(poll, 5000);
    }
  }

  setTimeout(poll, 5000);
}

// Parse "ADDR.NAME" into a contractPrincipalCV
const [sbtcAddr, sbtcName] = SBTC_CONTRACT.split(".");
const sbtcTokenCV = contractPrincipalCV(sbtcAddr, sbtcName);

// Use Vite proxy in dev to avoid CORS issues with Hiro API
const apiUrl = import.meta.env.DEV
  ? "/api"
  : "https://api.testnet.hiro.so";

// Read-only call helper
async function readOnly(functionName: string, args: ClarityValue[] = []) {
  const result = await fetchCallReadOnlyFunction({
    contractAddress: CONTRACT_ADDRESS,
    contractName: CONTRACT_NAME,
    functionName,
    functionArgs: args,
    senderAddress: CONTRACT_ADDRESS,
    network,
    client: { baseUrl: apiUrl },
  });
  return cvToJSON(result);
}

// --- Read-only functions ---

export async function getRoundInfo() {
  return readOnly("get-round-info");
}

export async function priceForNHashes(hashAmount: number) {
  return readOnly("price-for-n-hashes", [uintCV(hashAmount)]);
}

export async function getPriceAt(n: number) {
  return readOnly("get-price-at", [uintCV(n)]);
}

export async function getMinerInfo(address: string, round: number) {
  return readOnly("get-miner-info", [principalCV(address), uintCV(round)]);
}

export async function getMinerTag(address: string) {
  return readOnly("get-miner-tag", [principalCV(address)]);
}

export async function getPendingReward(address: string) {
  return readOnly("get-pending-reward", [principalCV(address)]);
}

export async function getReferralEarnings(address: string) {
  return readOnly("get-referral-earnings", [principalCV(address)]);
}

export async function getTotalWithdrawn(address: string) {
  return readOnly("get-total-withdrawn", [principalCV(address)]);
}

export async function getSharesStats() {
  return readOnly("get-shares-stats");
}

export async function getLastMiner() {
  return readOnly("get-last-miner");
}

export async function getVaultBalance() {
  return readOnly("get-vault-balance");
}

// --- Contract calls (write) ---

export async function registerMinerTag(
  tag: string,
  onFinish: (txId: string) => void
) {
  try {
    const result = await request("stx_callContract", {
      contract: contractId,
      functionName: "register-miner-tag",
      functionArgs: [
        stringAsciiCV(tag),
        sbtcTokenCV,
      ],
      network,
      postConditionMode: "allow",
    });
    if (result.txid) {
      onFinish(result.txid);
      watchTx(result.txid, `Registering tag "${tag}"...`, `Tag "${tag}" registered!`);
    }
  } catch (err) {
    toast.error("Failed to register tag", { description: String(err) });
    console.error("register-miner-tag failed:", err);
  }
}

export async function buyHashes(
  hashAmount: number,
  rig: number,
  maxSbtc: number,
  referrerTag: string | null,
  onFinish: (txId: string) => void
) {
  try {
    const result = await request("stx_callContract", {
      contract: contractId,
      functionName: "buy-hashes",
      functionArgs: [
        uintCV(hashAmount),
        uintCV(rig),
        uintCV(maxSbtc),
        referrerTag ? Cl.some(stringAsciiCV(referrerTag)) : Cl.none(),
        sbtcTokenCV,
      ],
      network,
      postConditionMode: "allow",
    });
    if (result.txid) {
      onFinish(result.txid);
      watchTx(result.txid, `Buying ${hashAmount} hashes...`, `Purchased ${hashAmount} hashes!`);
    }
  } catch (err) {
    toast.error("Failed to buy hashes", { description: String(err) });
    console.error("buy-hashes failed:", err);
  }
}

export async function claimMiningShares(onFinish: (txId: string) => void) {
  try {
    const result = await request("stx_callContract", {
      contract: contractId,
      functionName: "claim-mining-shares",
      functionArgs: [sbtcTokenCV],
      network,
      postConditionMode: "allow",
    });
    if (result.txid) {
      onFinish(result.txid);
      watchTx(result.txid, "Claiming mining shares...", "Mining shares claimed!");
    }
  } catch (err) {
    toast.error("Failed to claim mining shares", { description: String(err) });
    console.error("claim-mining-shares failed:", err);
  }
}

export async function claimMiningReward(onFinish: (txId: string) => void) {
  try {
    const result = await request("stx_callContract", {
      contract: contractId,
      functionName: "claim-mining-reward",
      functionArgs: [sbtcTokenCV],
      network,
      postConditionMode: "allow",
    });
    if (result.txid) {
      onFinish(result.txid);
      watchTx(result.txid, "Claiming mining reward...", "Mining reward claimed!");
    }
  } catch (err) {
    toast.error("Failed to claim mining reward", { description: String(err) });
    console.error("claim-mining-reward failed:", err);
  }
}

export async function startNewRound(onFinish: (txId: string) => void) {
  try {
    const result = await request("stx_callContract", {
      contract: contractId,
      functionName: "start-new-round",
      functionArgs: [],
      network,
      postConditionMode: "allow",
    });
    if (result.txid) {
      onFinish(result.txid);
      watchTx(result.txid, "Starting new round...", "New round started!");
    }
  } catch (err) {
    toast.error("Failed to start new round", { description: String(err) });
    console.error("start-new-round failed:", err);
  }
}

// --- Read-only: Unclaimed reward balances ---

export async function getMinerUnclaimedSbtc(address: string) {
  return readOnly("get-miner-unclaimed-sbtc", [principalCV(address)]);
}

export async function claimUnclaimedSbtc(onFinish: (txId: string) => void) {
  try {
    const result = await request("stx_callContract", {
      contract: contractId,
      functionName: "claim-unclaimed-sbtc",
      functionArgs: [sbtcTokenCV],
      network,
      postConditionMode: "allow",
    });
    if (result.txid) {
      onFinish(result.txid);
      watchTx(result.txid, "Claiming unclaimed sBTC...", "Unclaimed sBTC claimed!");
    }
  } catch (err) {
    toast.error("Failed to claim unclaimed sBTC", { description: String(err) });
    console.error("claim-unclaimed-sbtc failed:", err);
  }
}
