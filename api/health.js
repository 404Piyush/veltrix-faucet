const { getAllowedOrigin, getFaucetStatus } = require("../lib/faucet");

module.exports = async function handler(_req, res) {
  res.setHeader("Access-Control-Allow-Origin", getAllowedOrigin());
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (_req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  try {
    const status = await getFaucetStatus();
    res.status(200).json(status);
  } catch (error) {
    res.status(Number.isInteger(error.statusCode) ? error.statusCode : 500).json({
      ok: false,
      error: error.message,
    });
  }
};
