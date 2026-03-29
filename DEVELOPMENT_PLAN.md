# Pedal Fiddle — Stepwise Development Plan

**Version:** 1.0
**Date:** March 21, 2026
**Based on:** PRD v1.0

---

## Phase 0 — Project Scaffolding

1. Initialize a Next.js (App Router) project with TypeScript
2. Set up ESLint, Prettier, and `tsconfig.json`
3. Install core dependencies: `firebase-admin`, `next-auth`, `axios`, `zod`
4. Configure Vercel project and link repository
5. Create `.env.local` with all required environment variables (see PRD §13)
6. Set up Firebase project and Firestore database (create collections: `users`, `settings`, `activity_logs`)
7. Create `lib/firebase.ts` — Firebase Admin SDK singleton
8. Create `lib/encryption.ts` — AES-256 encrypt/decrypt utility for tokens and API keys

---

## Phase 1 — Strava OAuth Authentication

1. Register a Strava API Application to get `CLIENT_ID` and `CLIENT_SECRET`
2. Configure `next-auth` with a custom Strava OAuth provider (`/api/auth/[...nextauth]`)
3. Build the `GET /api/auth/strava` route — redirect to Strava authorization URL
4. Build the `GET /api/auth/callback` route — exchange code for tokens, encrypt them, store in `users/{userId}` in Firestore
5. Implement token auto-refresh logic in `lib/strava.ts` — check `stravaTokenExpiresAt`, call refresh endpoint if needed, update Firestore
6. Create a middleware (`middleware.ts`) that protects all `/dashboard` and `/api/*` routes (except `/api/auth/*` and `/api/webhooks/strava`), redirecting unauthenticated users to login
7. Build the landing/login page (`/app/page.tsx`) with a "Login with Strava" button
8. Build `GET /api/auth/logout` to clear session

---

## Phase 2 — Firestore Data Layer

1. Define TypeScript interfaces/types for all Firestore documents (`UserDoc`, `SettingsDoc`, `ActivityLogDoc`)
2. Create `lib/db/users.ts` — CRUD helpers for the `users` collection
3. Create `lib/db/settings.ts` — CRUD helpers for the `settings` collection; seed default settings on first login
4. Create `lib/db/activityLogs.ts` — write and paginated-read helpers for `activity_logs`
5. Create default settings seed function — populate default hide rules (Ride < 5 km, Run < 2 km, etc.) and default prompt templates from PRD §10

---

## Phase 3 — Strava Webhook Infrastructure

1. Build `GET /api/webhooks/strava` — respond to Strava's hub challenge verification (`hub.verify_token` + `hub.challenge`)
2. Build `POST /api/webhooks/strava` — receive Strava event payloads:
   - Return `200 OK` immediately
   - Filter: only process `event_type: "create"`, `object_type: "activity"`
   - Kick off async processing pipeline (using `waitUntil` or a background job pattern on Vercel)
3. Build `POST /api/setup/webhook` — register the webhook subscription with Strava using the Vercel deployment URL; store `webhookSubscriptionId` in Firestore
4. Build `DELETE /api/setup/webhook` — deregister the subscription from Strava and clear the stored ID
5. Store `STRAVA_WEBHOOK_VERIFY_TOKEN` as a Vercel environment variable

---

## Phase 4 — Activity Processing Pipeline

Build `lib/pipeline/processActivity.ts` — orchestrates all steps:

1. **Step 1 — Fetch Full Activity**: `GET /activities/{id}` via Strava API using refreshed token; extract all fields listed in PRD §7.3
2. **Step 2 — Load User Settings**: read from `settings/{userId}` in Firestore; short-circuit if `processingEnabled: false` and log as `"skipped"`
3. **Step 3 — Hide from Home Feed Rules**: evaluate each enabled rule against `activity.type` and `activity.distance`; build `hide_from_home` flag for PATCH payload
4. **Step 4 — AI Name Generation** (if `aiNameEnabled`):
   - Resolve prompt template placeholders with real activity values
   - Call configured AI provider (`lib/ai/groq.ts` or `lib/ai/gemini.ts`)
   - Fall back to original Strava name on error
5. **Step 5 — AI Description Generation** (if `aiDescriptionEnabled`):
   - Same resolution + AI call pattern as Step 4
   - Fall back to empty description on error
6. **Step 6 — PATCH Activity on Strava**: send `PATCH /activities/{id}` with `name`, `description`, `hide_from_home` fields
7. **Step 7 — Log Result**: write a full `ActivityLogDoc` entry to Firestore including all actions, prompts, responses, and status

---

## Phase 5 — AI Provider Integrations

1. Create `lib/ai/groq.ts` — Groq API client using `llama-3` model; takes prompt string, returns generated text
2. Create `lib/ai/gemini.ts` — Google Gemini API client; same interface as Groq client
3. Create `lib/ai/resolvePrompt.ts` — placeholder resolution engine: replaces `{{distance_km}}`, `{{activity_type}}`, `{{avg_pace}}`, etc. with real values from the activity object
4. Create `lib/ai/index.ts` — provider selector: reads `aiProvider` from settings, routes to the correct client
5. Build `POST /api/ai/preview` — accepts a sample activity (or uses last logged activity), runs Steps 4 & 5 against it, returns preview output without patching Strava

---

## Phase 6 — Settings Dashboard (UI)

All pages under `/app/dashboard/` — protected by middleware.

1. **Layout** — dashboard shell with sidebar navigation (General, AI Config, Hide Rules, Activity Log, Strava Connection)
2. **General Settings** (`/dashboard`) — master enable/disable toggle; individual feature toggles (AI Name, AI Description, Hide from Home Feed)
3. **AI Configuration** (`/dashboard/ai`) — AI provider selector, API key input, tone/style input, name prompt template textarea, description prompt template textarea, per-activity-type overrides, "Test AI" button wired to `/api/ai/preview`
4. **Hide from Home Feed Rules** (`/dashboard/rules`) — editable rules table (activity type, enabled toggle, distance threshold); add/remove rows; save
5. **Activity Log** (`/dashboard/logs`) — paginated table wired to `GET /api/logs`; columns per PRD §7.4.4; expandable rows; filter by status and date range; detailed view wired to `GET /api/logs/:id`
6. **Strava Connection** (`/dashboard/strava`) — display connected athlete (name + profile picture fetched from Strava); webhook status indicator; "Register Webhook" / "Re-register" buttons wired to `/api/setup/webhook`; "Disconnect" button

---

## Phase 7 — Settings API Routes

1. `GET /api/settings` — fetch and decrypt settings for the authenticated user
2. `PUT /api/settings` — validate with Zod, encrypt sensitive fields (API key), write to Firestore
3. `GET /api/logs` — paginated query of `activity_logs` filtered by `userId`; support `status` and date range query params
4. `GET /api/logs/:id` — fetch single log entry, return full detail

---

## Phase 8 — Error Handling & Reliability

1. Add exponential backoff retry wrapper (`lib/utils/retry.ts`) — max 3 retries; apply to all Strava API calls
2. Wrap all AI calls in try/catch; log warning and continue pipeline on failure
3. Add global error boundary in the dashboard layout
4. Add input validation (Zod schemas) on all API routes that accept a request body
5. Sanitize and validate incoming webhook payloads; return `400` on malformed requests

---

## Phase 9 — Security Hardening

1. Verify all API routes (except `/api/auth/*` and `/api/webhooks/strava`) require a valid `next-auth` session
2. Confirm `STRAVA_WEBHOOK_VERIFY_TOKEN` is validated on every incoming webhook GET and POST
3. Audit Firestore security rules — deny all client-side reads/writes (all access goes through the server-side Admin SDK only)
4. Ensure all secrets (`stravaAccessToken`, `stravaRefreshToken`, `aiApiKey`) are AES-256 encrypted before writing to Firestore

---

## Phase 10 — Testing & QA

1. Unit test `lib/encryption.ts`, `lib/ai/resolvePrompt.ts`, and the hide-rules evaluation logic
2. Integration test the full processing pipeline with a mock Strava activity payload
3. End-to-end test the OAuth login → dashboard → webhook trigger → log entry flow
4. Manually test webhook delivery using Strava's webhook tester or `ngrok` locally
5. Test AI fallback behaviour by simulating a failing AI API call

---

## Phase 11 — Deployment & Go-Live

1. Push all environment variables to Vercel project settings
2. Deploy to Vercel (production branch)
3. Register the Strava webhook subscription via the dashboard's "Register Webhook" button, pointing to the live Vercel URL
4. Perform a live end-to-end test: upload a real Strava activity and verify it is renamed, described, and/or hidden as configured
5. Monitor Vercel function logs and Firestore for the first few real events

---

## Build Order Summary

```
Phase 0 → 1 → 2 → 3 → 4 → 5 → 7 → 6 → 8 → 9 → 10 → 11
```

> Build and validate the backend pipeline (Phases 3–5) before investing in the UI (Phase 6), so bugs in the core processing logic are caught early.

---

*End of Development Plan v1.0*
