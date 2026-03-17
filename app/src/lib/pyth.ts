const PYTH_HERMES_URL = "https://hermes.pyth.network";
const BTC_USD_FEED_ID =
  "0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43";

export interface PythPriceData {
  vaaHex: string; // hex-encoded VAA for on-chain submission
  btcUsdPrice: number; // human-readable BTC/USD price
}

/**
 * Fetch the latest BTC/USD VAA from Pyth Hermes.
 * Returns the hex VAA (for passing to contract) and the parsed price.
 */
export async function fetchBtcUsdVaa(): Promise<PythPriceData> {
  const url = `${PYTH_HERMES_URL}/v2/updates/price/latest?ids[]=${BTC_USD_FEED_ID}&encoding=hex`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Hermes API error: ${resp.status}`);
  const data = await resp.json();

  const vaaHex: string = data.binary.data[0];
  const parsed = data.parsed[0].price;
  const btcUsdPrice =
    parseFloat(parsed.price) * Math.pow(10, parsed.expo);

  return { vaaHex: `0x${vaaHex}`, btcUsdPrice };
}

/**
 * Convert a sat amount to USDCx micro-units given BTC/USD price.
 */
export function satsToUsdcx(sats: number, btcUsdPrice: number): number {
  // sats / 1e8 * btcUsdPrice * 1e6
  return Math.ceil((sats / 1e8) * btcUsdPrice * 1e6);
}

/**
 * Convert USDCx micro-units to sat-equivalent given BTC/USD price.
 */
export function usdcxToSats(usdcx: number, btcUsdPrice: number): number {
  // usdcx / 1e6 / btcUsdPrice * 1e8
  return Math.floor((usdcx / 1e6 / btcUsdPrice) * 1e8);
}
