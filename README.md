# Veltrix Faucet

Veltrix faucet API for dispensing small amounts of native `VELT` on the public L2.

## What It Does

- Exposes `GET /api/health`
- Exposes `POST /api/faucet`
- Signs native-token transfers with a server-side faucet key
- Applies a basic in-memory cooldown by address and client IP
- Works both locally and on Vercel

## Local Run

```bash
npm install
cp .env.example .env
npm run dev
```

Server starts on `http://localhost:8080`.

## API

Health:

```bash
curl http://localhost:8080/api/health
```

Drip:

```bash
curl -X POST http://localhost:8080/api/faucet \
  -H 'content-type: application/json' \
  --data '{"address":"0x000000000000000000000000000000000000dead"}'
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

Recommended starting value:

```env
FAUCET_AMOUNT=0.001
```

## Vercel

Deploy:

```bash
npx vercel
npx vercel --prod
```

Use the same environment variables from `.env.example` in the Vercel project.
