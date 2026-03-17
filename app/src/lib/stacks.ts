import { request } from "@stacks/connect";
import {
  uintCV,
  stringAsciiCV,
  contractPrincipalCV,
  bufferCV,
  Cl,
  fetchCallReadOnlyFunction,
  cvToJSON,
  type ClarityValue,
} from "@stacks/transactions";
import { toast } from "sonner";
import { CONTRACT_ADDRESS, CONTRACT_NAME, SBTC_CONTRACT, USDCX_CONTRACT } from "./constants";
import { fetchBtcUsdVaa } from "./pyth";

const network = "testnet";
const contractId = `${CONTRACT_ADDRESS}.${CONTRACT_NAME}` as const;
const EXPLORER_URL = "https://explorer.hiro.so/txid";

function txToast(message: string, txid: string) {
  toast.success(message, {
    description: `TX: ${txid.slice(0, 16)}...`,
    action: {
      label: "View",
      onClick: () => window.open(`${EXPLORER_URL}/${txid}?chain=testnet`, "_blank"),
    },
    duration: 8000,
  });
}

// Parse "ADDR.NAME" into a contractPrincipalCV
const [sbtcAddr, sbtcName] = SBTC_CONTRACT.split(".");
const sbtcTokenCV = contractPrincipalCV(sbtcAddr, sbtcName);

const [usdcxAddr, usdcxName] = USDCX_CONTRACT.split(".");
const usdcxTokenCV = contractPrincipalCV(usdcxAddr, usdcxName);

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
  const { principalCV } = await import("@stacks/transactions");
  return readOnly("get-miner-info", [principalCV(address), uintCV(round)]);
}

export async function getMinerTag(address: string) {
  const { principalCV } = await import("@stacks/transactions");
  return readOnly("get-miner-tag", [principalCV(address)]);
}

export async function getPendingReward(address: string) {
  const { principalCV } = await import("@stacks/transactions");
  return readOnly("get-pending-reward", [principalCV(address)]);
}

export async function getReferralEarnings(address: string) {
  const { principalCV } = await import("@stacks/transactions");
  return readOnly("get-referral-earnings", [principalCV(address)]);
}

export async function getReferralEarningsUsdcx(address: string) {
  const { principalCV } = await import("@stacks/transactions");
  return readOnly("get-referral-earnings-usdcx", [principalCV(address)]);
}

export async function getTotalWithdrawn(address: string) {
  const { principalCV } = await import("@stacks/transactions");
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
      txToast(`Tag "${tag}" registered!`, result.txid);
      onFinish(result.txid);
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
      txToast(`Purchased ${hashAmount} hashes!`, result.txid);
      onFinish(result.txid);
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
      txToast("Mining shares claimed!", result.txid);
      onFinish(result.txid);
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
      txToast("Mining reward claimed!", result.txid);
      onFinish(result.txid);
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
      txToast("New round started!", result.txid);
      onFinish(result.txid);
    }
  } catch (err) {
    toast.error("Failed to start new round", { description: String(err) });
    console.error("start-new-round failed:", err);
  }
}

// --- Read-only: Unclaimed reward balances ---

export async function getMinerUnclaimedSbtc(address: string) {
  const { principalCV } = await import("@stacks/transactions");
  return readOnly("get-miner-unclaimed-sbtc", [principalCV(address)]);
}

export async function getMinerUnclaimedUsdcx(address: string) {
  const { principalCV } = await import("@stacks/transactions");
  return readOnly("get-miner-unclaimed-usdcx", [principalCV(address)]);
}

export async function getRoundUnclaimed(round: number) {
  return readOnly("get-round-unclaimed", [uintCV(round)]);
}

// --- Read-only: USDCx pools ---

export async function getAllPoolsUsdcx() {
  return readOnly("get-all-pools-usdcx");
}

// --- USDCx contract calls (write) ---

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.startsWith("0x") ? hex.slice(2) : hex;
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(clean.substring(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

export async function buyHashesUsdcx(
  hashAmount: number,
  rig: number,
  maxUsdcx: number,
  referrerTag: string | null,
  onFinish: (txId: string) => void
) {
  try {
    toast.info("Fetching oracle price...");
    const { vaaHex } = await fetchBtcUsdVaa();

    const result = await request("stx_callContract", {
      contract: contractId,
      functionName: "buy-hashes-usdcx",
      functionArgs: [
        uintCV(hashAmount),
        uintCV(rig),
        uintCV(maxUsdcx),
        referrerTag ? Cl.some(stringAsciiCV(referrerTag)) : Cl.none(),
        usdcxTokenCV,
        bufferCV(hexToBytes(vaaHex)),
      ],
      network,
      postConditionMode: "allow",
    });
    if (result.txid) {
      txToast(`Purchased ${hashAmount} hashes with USDCx!`, result.txid);
      onFinish(result.txid);
    }
  } catch (err) {
    toast.error("Failed to buy hashes with USDCx", { description: String(err) });
    console.error("buy-hashes-usdcx failed:", err);
  }
}

export async function registerMinerTagUsdcx(
  tag: string,
  onFinish: (txId: string) => void
) {
  try {
    toast.info("Fetching oracle price...");
    const { vaaHex } = await fetchBtcUsdVaa();

    const result = await request("stx_callContract", {
      contract: contractId,
      functionName: "register-miner-tag-usdcx",
      functionArgs: [
        stringAsciiCV(tag),
        usdcxTokenCV,
        bufferCV(hexToBytes(vaaHex)),
      ],
      network,
      postConditionMode: "allow",
    });
    if (result.txid) {
      txToast(`Tag "${tag}" registered with USDCx!`, result.txid);
      onFinish(result.txid);
    }
  } catch (err) {
    toast.error("Failed to register tag with USDCx", { description: String(err) });
    console.error("register-miner-tag-usdcx failed:", err);
  }
}

export async function claimMiningSharesDual(onFinish: (txId: string) => void) {
  try {
    toast.info("Fetching oracle price...");
    const { vaaHex } = await fetchBtcUsdVaa();

    const result = await request("stx_callContract", {
      contract: contractId,
      functionName: "claim-mining-shares-dual",
      functionArgs: [
        sbtcTokenCV,
        usdcxTokenCV,
        bufferCV(hexToBytes(vaaHex)),
      ],
      network,
      postConditionMode: "allow",
    });
    if (result.txid) {
      txToast("Mining shares claimed (dual-token)!", result.txid);
      onFinish(result.txid);
    }
  } catch (err) {
    toast.error("Failed to claim mining shares", { description: String(err) });
    console.error("claim-mining-shares-dual failed:", err);
  }
}

export async function settleMyUnclaimed(onFinish: (txId: string) => void) {
  try {
    const result = await request("stx_callContract", {
      contract: contractId,
      functionName: "settle-my-unclaimed",
      functionArgs: [],
      network,
      postConditionMode: "allow",
    });
    if (result.txid) {
      txToast("Unclaimed rewards settled!", result.txid);
      onFinish(result.txid);
    }
  } catch (err) {
    toast.error("Failed to settle unclaimed rewards", { description: String(err) });
    console.error("settle-my-unclaimed failed:", err);
  }
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
      txToast("Unclaimed sBTC reward claimed!", result.txid);
      onFinish(result.txid);
    }
  } catch (err) {
    toast.error("Failed to claim unclaimed sBTC", { description: String(err) });
    console.error("claim-unclaimed-sbtc failed:", err);
  }
}

export async function claimUnclaimedUsdcx(onFinish: (txId: string) => void) {
  try {
    const result = await request("stx_callContract", {
      contract: contractId,
      functionName: "claim-unclaimed-usdcx",
      functionArgs: [usdcxTokenCV],
      network,
      postConditionMode: "allow",
    });
    if (result.txid) {
      txToast("Unclaimed USDCx reward claimed!", result.txid);
      onFinish(result.txid);
    }
  } catch (err) {
    toast.error("Failed to claim unclaimed USDCx", { description: String(err) });
    console.error("claim-unclaimed-usdcx failed:", err);
  }
}

export async function claimMiningRewardDual(onFinish: (txId: string) => void) {
  try {
    toast.info("Fetching oracle price...");
    const { vaaHex } = await fetchBtcUsdVaa();

    const result = await request("stx_callContract", {
      contract: contractId,
      functionName: "claim-mining-reward-dual",
      functionArgs: [
        sbtcTokenCV,
        usdcxTokenCV,
        bufferCV(hexToBytes(vaaHex)),
      ],
      network,
      postConditionMode: "allow",
    });
    if (result.txid) {
      txToast("Mining reward claimed (dual-token)!", result.txid);
      onFinish(result.txid);
    }
  } catch (err) {
    toast.error("Failed to claim mining reward", { description: String(err) });
    console.error("claim-mining-reward-dual failed:", err);
  }
}
