const { parseEther } = require("ethers");

function readRequired(name) {
  const value = process.env[name];
  if (!value) {
    const error = new Error(`Missing required environment variable: ${name}`);
    error.statusCode = 500;
    throw error;
  }
  return value.trim();
}

function normalizePrivateKey(rawKey) {
  const trimmed = rawKey.trim();
  const prefixed = trimmed.startsWith("0x") ? trimmed : `0x${trimmed}`;
  if (!/^0x[0-9a-fA-F]{64}$/.test(prefixed)) {
    const error = new Error("FAUCET_PRIVATE_KEY must be a 32-byte hex key");
    error.statusCode = 500;
    throw error;
  }
  return prefixed;
}

function parseEnvNumber(name, fallback) {
  const raw = process.env[name];
  if (!raw) return fallback;
  const value = Number.parseInt(raw, 10);
  if (!Number.isFinite(value) || value < 0) {
    const error = new Error(`${name} must be a non-negative integer`);
    error.statusCode = 500;
    throw error;
  }
  return value;
}

function parseEnvEther(name, fallback) {
  const raw = process.env[name];
  if (!raw) return parseEther(fallback);
  try {
    return parseEther(raw.trim());
  } catch {
    const error = new Error(`${name} must be a valid ether amount string`);
    error.statusCode = 500;
    throw error;
  }
}

function getConfig() {
  const rpcUrl = (process.env.L2_RPC_URL || "https://veltrix-rpc.404piyush.me").trim();
  const privateKey = normalizePrivateKey(readRequired("FAUCET_PRIVATE_KEY"));

  return {
    rpcUrl,
    privateKey,
    chainIdExpected: BigInt(process.env.L2_CHAIN_ID || "845320"),
    nativeSymbol: process.env.L2_NATIVE_SYMBOL || "VELT",
    faucetAmountWei: parseEnvEther("FAUCET_AMOUNT", "0.001"),
    minReserveWei: parseEnvEther("FAUCET_MIN_RESERVE", "0.05"),
    cooldownSeconds: parseEnvNumber("FAUCET_COOLDOWN_SECONDS", 86400),
    allowedOrigin: process.env.FAUCET_ALLOWED_ORIGIN || "*",
  };
}

module.exports = {
  getConfig,
};
