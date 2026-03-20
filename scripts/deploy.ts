/**
 * Deployment script for MineABitcoin.clar
 *
 * Usage:
 *   npx tsx scripts/deploy.ts [testnet|mainnet]
 *
 * Environment variables (required):
 *   DEPLOYER_MNEMONIC  - 24-word seed phrase of the deployer wallet
 *
 * Optional:
 *   CONTRACT_NAME      - override the on-chain contract name
 *                        (default: MineABitcoinBetaV01)
 *   STACKS_API_URL     - override the Stacks API endpoint
 */

import { readFileSync, existsSync } from "fs";
import { config as loadDotenv } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import {
  makeContractDeploy,
  broadcastTransaction,
  AnchorMode,
  PostConditionMode,
  makeContractCall,
  uintCV,
  principalCV,
} from "@stacks/transactions";
import { STACKS_TESTNET, STACKS_MAINNET } from "@stacks/network";
import { generateWallet, getStxAddress } from "@stacks/wallet-sdk";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

// Load .env if present
const envPath = resolve(ROOT, ".env");
if (existsSync(envPath)) loadDotenv({ path: envPath });

const NETWORK_ARG = (process.argv[2] ?? "testnet").toLowerCase();
if (NETWORK_ARG !== "testnet" && NETWORK_ARG !== "mainnet") {
  console.error('Usage: npx tsx scripts/deploy.ts [testnet|mainnet]');
  process.exit(1);
}

const IS_MAINNET = NETWORK_ARG === "mainnet";

const SBTC_CONTRACT = IS_MAINNET
  ? "SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4.sbtc-token"
  : "ST1F7QA2MDF17S807EPA36TSS8AMEFY4KA9TVGWXT.sbtc-token";

const DEFAULT_API_URL = IS_MAINNET
  ? "https://api.hiro.so"
  : "https://api.testnet.hiro.so";

const API_URL = process.env.STACKS_API_URL ?? DEFAULT_API_URL;
const CONTRACT_NAME = process.env.CONTRACT_NAME ?? "MineABitcoinBetaV01";

const network = IS_MAINNET
  ? { ...STACKS_MAINNET, client: { baseUrl: API_URL } }
  : { ...STACKS_TESTNET, client: { baseUrl: API_URL } };

// ---------------------------------------------------------------------------
// Load deployer wallet
// ---------------------------------------------------------------------------

const mnemonic = process.env.DEPLOYER_MNEMONIC;
if (!mnemonic) {
  console.error("Error: DEPLOYER_MNEMONIC environment variable is not set.");
  process.exit(1);
}

async function getDeployerKey(): Promise<{ privateKey: string; address: string }> {
  const { TransactionVersion } = await import("@stacks/network");
  const wallet = await generateWallet({ secretKey: mnemonic!, password: "" });
  const account = wallet.accounts[0];
  const address = getStxAddress({
    account,
    transactionVersion: IS_MAINNET
      ? TransactionVersion.Mainnet
      : TransactionVersion.Testnet,
  });
  return { privateKey: account.stxPrivateKey, address };
}

// ---------------------------------------------------------------------------
// Deploy
// ---------------------------------------------------------------------------

async function deploy() {
  const { privateKey, address } = await getDeployerKey();

  const contractSource = readFileSync(
    resolve(ROOT, "contracts", "MineABitcoin.clar"),
    "utf-8"
  );

  console.log(`\n=== MineABitcoin Deployment ===`);
  console.log(`Network      : ${NETWORK_ARG}`);
  console.log(`API          : ${API_URL}`);
  console.log(`Deployer     : ${address}`);
  console.log(`Contract name: ${CONTRACT_NAME}`);
  console.log(`sBTC contract: ${SBTC_CONTRACT}`);
  console.log();

  // 1. Deploy the contract
  console.log("Step 1/2 — Broadcasting contract deploy transaction...");
  const deployTx = await makeContractDeploy({
    contractName: CONTRACT_NAME,
    codeBody: contractSource,
    senderKey: privateKey,
    network,
    anchorMode: AnchorMode.OnChainOnly,
    postConditionMode: PostConditionMode.Allow,
    clarityVersion: 3, // contract uses as-contract which requires Clarity ≤ 3
    fee: 100_000n, // 0.001 STX; adjust if needed
  });

  const deployResult = await broadcastTransaction({ transaction: deployTx, network });

  if (deployResult.error) {
    console.error("Deploy broadcast failed:", deployResult.error, deployResult.reason);
    process.exit(1);
  }

  const deployTxId = deployResult.txid;
  console.log(`Deploy tx broadcast: 0x${deployTxId}`);
  console.log(`Track: ${API_URL}/extended/v1/tx/0x${deployTxId}`);

  // 2. Update the sBTC principal if not mainnet default
  //    (The contract defaults to the testnet sBTC address; on mainnet we must update it.)
  if (IS_MAINNET) {
    console.log("\nStep 2/2 — Waiting for deploy to confirm then calling set-sbtc...");
    await waitForConfirmation(deployTxId);

    console.log(`Calling set-sbtc with ${SBTC_CONTRACT}...`);
    const [sbtcAddr, sbtcName] = SBTC_CONTRACT.split(".");
    const setTx = await makeContractCall({
      contractAddress: address,
      contractName: CONTRACT_NAME,
      functionName: "set-sbtc",
      functionArgs: [principalCV(`${sbtcAddr}.${sbtcName}`)],
      senderKey: privateKey,
      network,
      anchorMode: AnchorMode.OnChainOnly,
      postConditionMode: PostConditionMode.Allow,
      fee: 10_000n,
    });

    const setResult = await broadcastTransaction({ transaction: setTx, network });
    if (setResult.error) {
      console.error("set-sbtc broadcast failed:", setResult.error, setResult.reason);
      console.warn("You must call set-sbtc manually after the deploy confirms.");
    } else {
      console.log(`set-sbtc tx broadcast: 0x${setResult.txid}`);
    }
  } else {
    console.log("Step 2/2 — Skipped (testnet sBTC address is already baked in).");
  }

  console.log("\nDone! Summary:");
  console.log(`  Deployer  : ${address}`);
  console.log(`  Contract  : ${address}.${CONTRACT_NAME}`);
  console.log(`  Deploy tx : 0x${deployTxId}`);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function waitForConfirmation(txid: string, pollMs = 10_000): Promise<void> {
  const url = `${API_URL}/extended/v1/tx/0x${txid}`;
  process.stdout.write("  Polling");
  while (true) {
    process.stdout.write(".");
    const res = await fetch(url);
    if (res.ok) {
      const data: any = await res.json();
      if (data.tx_status === "success") {
        process.stdout.write(" confirmed!\n");
        return;
      }
      if (data.tx_status === "abort_by_response" || data.tx_status === "abort_by_post_condition") {
        process.stdout.write("\n");
        throw new Error(`Transaction failed with status: ${data.tx_status}`);
      }
    }
    await new Promise((r) => setTimeout(r, pollMs));
  }
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

deploy().catch((err) => {
  console.error("Deployment error:", err);
  process.exit(1);
});
