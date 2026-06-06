# Paytm Vision PWA

Next.js PWA starter with Google login, buyer/merchant role onboarding, durable role persistence, and a server-only OpenAI Realtime session endpoint for future vision work.

It now includes a standalone Point & Ask AI product at `/gemini`. The route is unauthenticated and focused on camera-based visual Q&A: start the camera, ask a question, auto-capture the current frame, answer with server-side OpenAI vision, and save local history in IndexedDB. Merchant role selection opens this same working product.

## Stack

- Next.js App Router
- Auth.js / NextAuth Google OAuth
- Prisma with PostgreSQL
- Manual PWA manifest and service worker
- Server route for OpenAI vision Q&A
- Server route for OpenAI Realtime client secrets

## Setup

1. Copy `.env.example` to `.env.local`.
2. Fill `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `DATABASE_URL`, and later `OPENAI_API_KEY`.
3. Run `npm install`.
4. Run `npm run prisma:migrate -- --name init`.
5. Run `npm run dev`.

## Point & Ask AI

Open `/gemini` directly. This route does not require login, a role, a database record, or any Paytm flow.

The demo:

1. Starts the browser camera after you tap Start Camera.
2. Prefers the rear camera on mobile.
3. Lets you type or speak a question.
4. Captures the current frame automatically when you tap Ask AI.
5. Sends the frame and question to `POST /api/ask`.
6. Shows the answer, observations, and optional detected item table.
7. Saves the last interactions locally in IndexedDB.

If `OPENAI_API_KEY` is missing or an API call fails, `/api/ask` returns realistic mock answers so the UI remains testable. Set `NEXT_PUBLIC_ENABLE_MOCK_MODE=force` only when you want to skip OpenAI even with a configured key.

Relevant env vars:

```text
OPENAI_API_KEY=
OPENAI_VISION_MODEL=gpt-4.1-mini
NEXT_PUBLIC_ENABLE_MOCK_MODE=true
```

`OPENAI_API_KEY` must stay server-side. Manual typing and optional browser speech recognition are the active question input paths.

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
