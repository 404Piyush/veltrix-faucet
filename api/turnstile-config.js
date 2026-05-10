const { getAllowedOrigin, getPublicConfig } = require("../lib/faucet");

module.exports = async function handler(_req, res) {
  res.setHeader("Access-Control-Allow-Origin", getAllowedOrigin());
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (_req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  res.status(200).json({
    ok: true,
    ...getPublicConfig(),
  });
};
