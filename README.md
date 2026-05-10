# Veltrix Faucet

Veltrix faucet for dispensing small amounts of native `VEL` on the public L2.

## What It Does

- Next.js app router homepage at `/`
- Exposes `GET /api/health`
- Exposes `GET /api/turnstile-config`
- Exposes `POST /api/faucet`
- Signs native-token transfers with a server-side faucet key
- Protects claims with Cloudflare Turnstile
- Applies a basic in-memory cooldown by address and client IP
- Uses a green terminal UI with an interactive 3D core
- Works both locally and on Vercel

## Local Run

```bash
npm install
cp .env.example .env
npm run dev
```

Next dev starts on `http://localhost:3000`.

## API

Health:

```bash
curl http://localhost:3000/api/health
```

Drip:

```bash
curl -X POST http://localhost:3000/api/faucet \
  -H 'content-type: application/json' \
  --data '{"address":"0x000000000000000000000000000000000000dead","turnstileToken":"<token>"}'
```

## Environment Variables

- `L2_RPC_URL`
- `L2_CHAIN_ID`
- `L2_NATIVE_SYMBOL`
- `FAUCET_PRIVATE_KEY`
- `FAUCET_AMOUNT`
- `FAUCET_MIN_RESERVE`
- `FAUCET_COOLDOWN_SECONDS`
- `FAUCET_ALLOWED_ORIGIN`
- `TURNSTILE_SITE_KEY`
- `TURNSTILE_SECRET_KEY`

Recommended starting value:

```env
FAUCET_AMOUNT=0.001
```

## Turnstile Keys

Create them in Cloudflare:

1. Open the Cloudflare dashboard.
2. Go to **Turnstile**.
3. Click **Add widget**.
4. Add hostnames:
   - `veltrix-faucet.404piyush.me`
   - `veltrix-faucet.vercel.app`
5. Choose widget mode:
   - `Managed` is the safest default.
6. Create the widget and copy:
   - `Sitekey` -> `TURNSTILE_SITE_KEY`
   - `Secret key` -> `TURNSTILE_SECRET_KEY`

## Vercel

Deploy:

```bash
npx vercel
npx vercel --prod
```

Use the same environment variables from `.env.example` in the Vercel project.
