require("dotenv").config();

const path = require("node:path");
const express = require("express");
const cors = require("cors");

const { getAllowedOrigin, getFaucetStatus, getPublicConfig, handleDripRequest } = require("./lib/faucet");
const { renderHomepage } = require("./lib/homepage");

const app = express();
const allowedOrigin = getAllowedOrigin();

app.use(
  cors({
    origin: allowedOrigin,
  })
);
app.use(express.json());
app.get("/", (_req, res) => {
  res.setHeader("cache-control", "public, max-age=0, must-revalidate");
  res.type("html").send(renderHomepage());
});
app.use(express.static(path.resolve(__dirname)));

app.get("/api/health", async (_req, res) => {
  try {
    const status = await getFaucetStatus();
    res.json(status);
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: error.message,
    });
  }
});

app.get("/api/turnstile-config", (_req, res) => {
  res.json({
    ok: true,
    ...getPublicConfig(),
  });
});

app.options("/api/faucet", (_req, res) => {
  res.status(204).end();
});

app.post("/api/faucet", async (req, res) => {
  const clientIp =
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.socket?.remoteAddress ||
    "unknown";

  try {
    const result = await handleDripRequest({
      address: req.body?.address,
      ip: clientIp,
      turnstileToken:
        req.body?.turnstileToken ||
        req.body?.cfTurnstileToken ||
        req.body?.["cf-turnstile-response"],
    });

    res.json(result);
  } catch (error) {
    const statusCode = Number.isInteger(error.statusCode) ? error.statusCode : 500;
    res.status(statusCode).json({
      ok: false,
      error: error.message,
    });
  }
});

const port = Number.parseInt(process.env.PORT || "8080", 10);
app.listen(port, () => {
  console.log(`Veltrix faucet listening on ${port}`);
});
