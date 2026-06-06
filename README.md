# Paytm Vision PWA

Next.js PWA starter with Google login, buyer/merchant role onboarding, durable role persistence, and a server-only OpenAI Realtime session endpoint for future vision work.

It now includes a standalone voice-led onboarding product at `/gemini`. The route starts one live video frame, speaks the merchant through KYC and inventory capture, extracts Aadhaar OCR and inventory with server-side OpenAI vision, stores the prototype capture locally in IndexedDB, and generates a storefront JSON export. Merchant role selection opens this same working product.

## Stack

- Next.js App Router
- Auth.js / NextAuth Google OAuth
- Prisma with PostgreSQL
- Manual PWA manifest and service worker
- Server route for OpenAI vision extraction
- Server route for OpenAI Realtime voice credentials
- Server route for OpenAI Realtime client secrets

## Setup

1. Copy `.env.example` to `.env.local`.
2. Fill `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `DATABASE_URL`, and later `OPENAI_API_KEY`.
3. Run `npm install`.
4. Run `npm run prisma:migrate -- --name init`.
5. Run `npm run dev`.

## Voice-Led Onboarding

Open `/gemini` directly, or sign in and choose Merchant. This route does not require a database record for the capture itself.

The flow:

1. Starts camera and microphone after you tap Start.
2. Speaks: “Let’s start with your KYC. Please provide some verification by showing your Aadhaar card.”
3. Captures frames automatically and sends them to `POST /api/onboarding/extract` for KYC OCR.
4. Stores full OCR locally in IndexedDB for this prototype.
5. Speaks: “Got it. Let’s get your inventory...”
6. Captures product frames and voice transcript automatically, merging visible labels with spoken quantities.
7. Speaks: “Ok, creating your storefront.”
8. Generates a local JSON export. It does not publish a public storefront in v1.

If `OPENAI_API_KEY` is missing or an API call fails, the extraction route returns realistic mock data so the UI remains testable. Set `NEXT_PUBLIC_ENABLE_MOCK_MODE=force` only when you want to skip OpenAI even with a configured key.

Relevant env vars:

```text
OPENAI_API_KEY=
OPENAI_VISION_MODEL=gpt-4.1-mini
OPENAI_REALTIME_MODEL=gpt-realtime
NEXT_PUBLIC_ENABLE_MOCK_MODE=true
```

`OPENAI_API_KEY` must stay server-side. Realtime voice uses an ephemeral client secret minted by `/api/onboarding/realtime`; if Realtime fails, the app falls back to browser speech recognition and speech synthesis.

## Google OAuth Credentials

In Google Cloud Console:

1. Create or choose a project.
2. Configure the OAuth consent screen. For local testing, add yourself as a test user if the app is in testing mode.
3. Go to APIs & Services -> Credentials -> Create Credentials -> OAuth client ID.
4. Select Web application.
5. Add this authorized redirect URI for local development:

   ```text
   http://localhost:3000/api/auth/callback/google
   ```

6. Copy the client ID into `AUTH_GOOGLE_ID` and the client secret into `AUTH_GOOGLE_SECRET`.
7. Generate `AUTH_SECRET` with `npx auth secret` or any strong random 32+ character value.

For production, add the deployed callback too:

```text
https://your-domain.com/api/auth/callback/google
```

## OpenAI Realtime Route

`POST /api/openai/realtime/session` requires:

- A signed-in Google user
- A saved app role: `buyer` or `merchant`
- `OPENAI_API_KEY` on the server

The route returns the OpenAI Realtime client secret payload for browser-side WebRTC setup. Keep the standard OpenAI API key server-side only.

OpenAI's Realtime WebRTC guidance uses a backend endpoint to create short-lived client secrets. This app keeps that boundary in `app/api/openai/realtime/session/route.ts`, so the future camera client can request an ephemeral secret without exposing `OPENAI_API_KEY`.
