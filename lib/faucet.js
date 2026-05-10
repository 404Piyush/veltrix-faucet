const { isAddress, JsonRpcProvider, Wallet, formatEther } = require("ethers");

const { getConfig } = require("./config");

const byAddress = new Map();
const byIp = new Map();

let cachedProvider;
let cachedWallet;
let cachedConfigKey;

function getAllowedOrigin() {
  return getConfig().allowedOrigin;
}

function getClient() {
  const config = getConfig();
  const cacheKey = `${config.rpcUrl}:${config.privateKey}`;
  if (cachedProvider && cachedWallet && cachedConfigKey === cacheKey) {
    return { config, provider: cachedProvider, wallet: cachedWallet };
  }

  const provider = new JsonRpcProvider(config.rpcUrl);
  const wallet = new Wallet(config.privateKey, provider);

  cachedProvider = provider;
  cachedWallet = wallet;
  cachedConfigKey = cacheKey;

  return { config, provider, wallet };
}

function makeHttpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function assertAddress(address) {
  if (!address || typeof address !== "string" || !isAddress(address)) {
    throw makeHttpError(400, "A valid recipient address is required");
  }
}

function prune(map, nowMs, cooldownMs) {
  for (const [key, value] of map.entries()) {
    if (nowMs - value > cooldownMs) {
      map.delete(key);
    }
  }
}

function getPublicConfig() {
  const config = getConfig();
  return {
    nativeSymbol: config.nativeSymbol,
    faucetAmountWei: config.faucetAmountWei.toString(),
    faucetAmountFormatted: formatEther(config.faucetAmountWei),
    cooldownSeconds: config.cooldownSeconds,
    turnstileConfigured: Boolean(config.turnstileSiteKey && config.turnstileSecretKey),
    turnstileSiteKey: config.turnstileSiteKey,
  };
}

async function verifyTurnstileToken({ token, ip }) {
  const config = getConfig();

  if (!config.turnstileSiteKey || !config.turnstileSecretKey) {
    throw makeHttpError(503, "Turnstile is not configured on the faucet yet");
  }

  if (!token || typeof token !== "string") {
    throw makeHttpError(400, "Complete the CAPTCHA challenge before claiming");
  }

  const body = new URLSearchParams({
    secret: config.turnstileSecretKey,
    response: token,
  });

  if (ip && ip !== "unknown") {
    body.set("remoteip", String(ip));
  }

  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
    },
    body,
  });

  if (!response.ok) {
    throw makeHttpError(502, "Turnstile verification request failed");
  }

  const result = await response.json();
  if (!result.success) {
    const errorCode = Array.isArray(result["error-codes"]) ? result["error-codes"][0] : "challenge-failed";
    throw makeHttpError(403, `Turnstile verification failed: ${errorCode}`);
  }
}

async function getFaucetStatus() {
  const { config, provider, wallet } = getClient();
  const [network, balanceWei] = await Promise.all([
    provider.getNetwork(),
    provider.getBalance(wallet.address),
  ]);

  return {
    ok: true,
    faucetAddress: wallet.address,
    balanceWei: balanceWei.toString(),
    balanceFormatted: formatEther(balanceWei),
    chainId: network.chainId.toString(),
    chainIdExpected: config.chainIdExpected.toString(),
    nativeSymbol: config.nativeSymbol,
    faucetAmountWei: config.faucetAmountWei.toString(),
    faucetAmountFormatted: formatEther(config.faucetAmountWei),
    minReserveWei: config.minReserveWei.toString(),
    minReserveFormatted: formatEther(config.minReserveWei),
    cooldownSeconds: config.cooldownSeconds,
    turnstileConfigured: Boolean(config.turnstileSiteKey && config.turnstileSecretKey),
    ready:
      network.chainId === config.chainIdExpected &&
      balanceWei >= config.faucetAmountWei + config.minReserveWei,
  };
}

async function handleDripRequest({ address, ip, turnstileToken }) {
  assertAddress(address);
  await verifyTurnstileToken({ token: turnstileToken, ip });

  const { config, provider, wallet } = getClient();
  const [network, balanceWei] = await Promise.all([
    provider.getNetwork(),
    provider.getBalance(wallet.address),
  ]);

  if (network.chainId !== config.chainIdExpected) {
    throw makeHttpError(
      500,
      `Unexpected chain ID from RPC. Expected ${config.chainIdExpected}, received ${network.chainId}`
    );
  }

  if (balanceWei < config.faucetAmountWei + config.minReserveWei) {
    throw makeHttpError(
      503,
      `Faucet balance is too low. Current balance is ${formatEther(balanceWei)} ${config.nativeSymbol}`
    );
  }

  const cooldownMs = config.cooldownSeconds * 1000;
  const nowMs = Date.now();
  prune(byAddress, nowMs, cooldownMs);
  prune(byIp, nowMs, cooldownMs);

  const normalizedAddress = address.toLowerCase();
  const normalizedIp = String(ip || "unknown");
  const lastAddressClaim = byAddress.get(normalizedAddress);
  const lastIpClaim = byIp.get(normalizedIp);
  const nextAllowedAt = Math.max(lastAddressClaim || 0, lastIpClaim || 0) + cooldownMs;

  if (nextAllowedAt > nowMs) {
    throw makeHttpError(
      429,
      `Cooldown active. Try again after ${Math.ceil((nextAllowedAt - nowMs) / 1000)} seconds`
    );
  }

  const tx = await wallet.sendTransaction({
    to: address,
    value: config.faucetAmountWei,
  });

  byAddress.set(normalizedAddress, nowMs);
  byIp.set(normalizedIp, nowMs);

  return {
    ok: true,
    txHash: tx.hash,
    faucetAddress: wallet.address,
    recipient: address,
    amountWei: config.faucetAmountWei.toString(),
    amountFormatted: formatEther(config.faucetAmountWei),
    nativeSymbol: config.nativeSymbol,
    chainId: network.chainId.toString(),
  };
}

module.exports = {
  getAllowedOrigin,
  getFaucetStatus,
  getPublicConfig,
  handleDripRequest,
};
