# Veltrix Faucet - Developer Handover

## Current State
- Platform: Next.js app router plus Vercel API routes
- Homepage: `/`
- API: `/api/health`, `/api/turnstile-config`, `/api/faucet`
- L2 faucet address: derived from `FAUCET_PRIVATE_KEY` at runtime
- Native symbol: `VEL`
- CAPTCHA: Cloudflare Turnstile
- Live production domain: `https://veltrix-faucet.404piyush.me`
- UI: green-on-black terminal theme with an interactive 3D core

## Done
1. Removed the hardcoded localhost RPC dependency.
2. Normalized private key parsing.
3. Added a homepage so the root domain no longer returns a 404.
4. Added Turnstile verification before drips are sent.
5. Set the default payout to `0.001 VEL` per request.
6. Added live config and health endpoints for the faucet.
7. Migrated the frontend to Next.js with a terminal-style redesign.

## Required Env Vars
- `FAUCET_PRIVATE_KEY`
- `L2_RPC_URL`
- `L2_NATIVE_SYMBOL=VEL`
- `TURNSTILE_SITE_KEY`
- `TURNSTILE_SECRET_KEY`

## Remaining
- Rotate the Turnstile secret because it was exposed during debugging.
- Recreate the Turnstile widget if Cloudflare still returns `400020`.
- Replace in-memory cooldowns with durable storage if traffic grows.
- Add analytics or admin logs for claim events.
