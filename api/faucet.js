const { getAllowedOrigin, handleDripRequest } = require("../lib/faucet");

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", getAllowedOrigin());
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({
      ok: false,
      error: "Method not allowed",
    });
    return;
  }

  const clientIp =
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.socket?.remoteAddress ||
    "unknown";

  try {
    const result = await handleDripRequest({
      address: req.body?.address,
      ip: clientIp,
    });
    res.status(200).json(result);
  } catch (error) {
    res.status(Number.isInteger(error.statusCode) ? error.statusCode : 500).json({
      ok: false,
      error: error.message,
    });
  }
};
