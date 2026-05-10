# Veltrix Faucet - Developer Handover

## Service State
- **Platform:** Shared local Express server + Vercel API routes
- **Homepage:** `/`
- **API:** `/api/health`, `/api/turnstile-config`, `/api/faucet`
- **L2 Faucet Address:** Derived from `FAUCET_PRIVATE_KEY` at runtime
- **Balance:** Must be checked from `/api/health`; do not trust stale markdown
- **Native Symbol:** `VELT`
- **CAPTCHA:** Cloudflare Turnstile

## Recent Changes
1. Removed hardcoded localhost RPC dependency.
2. Normalized private key parsing.
3. Added homepage so the root domain no longer returns a 404.
4. Added Turnstile verification before drips are sent.
5. Kept default payout at `0.001 VELT` per request.

## Required Env Vars
- `FAUCET_PRIVATE_KEY`
- `L2_RPC_URL`
- `TURNSTILE_SITE_KEY`
- `TURNSTILE_SECRET_KEY`

## Next for Dev
- Replace in-memory cooldowns with durable storage if traffic grows.
- Add analytics or admin logs for claim events.
