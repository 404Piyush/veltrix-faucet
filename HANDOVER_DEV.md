# Veltrix Faucet - Developer Handover

## ⛲ Service State
- **Platform:** Shared local Express server + Vercel API routes
- **Endpoint:** `faucet-veltrix.404piyush.me`
- **L2 Faucet Address:** Derived from `FAUCET_PRIVATE_KEY` at runtime
- **Balance:** Must be checked from `/api/health`; do not trust stale markdown
- **Native Symbol:** VELT

## 🛠️ Recent Changes
1. **Service Creation:** Scaffolded a clean, independent faucet repository.
2. **Key Security:** Configured `.env` and `.gitignore` to protect the `FAUCET_PRIVATE_KEY`.
3. **Runtime Fixes:** Removed hardcoded localhost RPC dependency, normalized private key parsing, and added health/cooldown checks.
4. **Deployment Shape:** Added Vercel-compatible API routes under `api/`.
5. **Drip Default:** Default faucet payout is now `0.001 VELT` per request unless overridden by `FAUCET_AMOUNT`.

## 🚀 Usage
- **Health:** `GET /api/health`
- **Endpoint:** `POST /api/faucet`
- **Payload:** `{ "address": "0x..." }`

## 🚧 Next for Dev
- Fund the actual key-derived faucet address returned by `/api/health`.
- Upgrade abuse protection beyond in-memory cooldowns if public traffic becomes meaningful.
