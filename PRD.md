# PRD: Pedal Fiddle — Strava Activity Auto-Modifier

**Version:** 1.0  
**Date:** March 21, 2026  
**Status:** Draft  
**Author:** hchachra2  

---

## 1. Overview

Pedal Fiddle is a personal web application that automatically processes new Strava activities in near real-time as they are uploaded. It enriches activities with AI-generated names and descriptions, and applies configurable privacy/visibility rules — all without manual intervention. The user configures their preferences once via a settings dashboard, and the app handles everything from there.

---

## 2. Goals

- Automatically modify Strava activities within seconds/minutes of upload
- Generate intelligent, data-rich activity names and descriptions using a free AI provider
- Apply configurable rules for hiding activities from the Strava home feed based on activity type and distance
- Provide a clean settings dashboard to manage all behaviour
- Require zero manual intervention once configured

---

## 3. Non-Goals (v1)

- Supporting multiple Strava accounts
- Mobile app
- Bulk retroactive processing of historical activities (may be a v2 feature)
- Social features or sharing
- Paid AI providers

---

## 4. Users

This is a single-user personal tool. The sole user is the owner of the Strava account. Authentication is handled via "Login with Strava" (OAuth 2.0), which doubles as both identity verification and API access grant.

---

## 5. Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js (React) |
| Backend | Next.js API Routes (Node.js) |
| Hosting | Vercel |
| Database | Firebase Firestore (free tier) |
| Authentication | Strava OAuth 2.0 |
| AI Provider | Google Gemini API (free tier) or Groq (free tier, fast inference) |
| Strava Integration | Strava API v3 + Webhooks |

> **DB Rationale:** Firebase Firestore integrates cleanly with Vercel serverless functions, has a generous free tier, requires no infrastructure management, and handles real-time config reads well. Alternative: Upstash Redis.

> **AI Rationale:** Groq (via `llama-3` models) offers a free tier with fast inference suitable for real-time activity processing. Google Gemini API is a solid fallback. Both are free within reasonable usage limits.

---

## 6. Architecture Overview

```
Strava App Upload
       │
       ▼
Strava Webhook ──► POST /api/webhooks/strava  (Vercel serverless function)
                          │
                          ▼
                   Fetch full activity data from Strava API
                          │
                          ▼
                   Load user rules from Firestore
                          │
                    ┌─────┴──────┐
                    ▼            ▼
             Apply Rules     Generate AI name
             (hide from      & description
              home feed)     (Groq / Gemini)
                    │            │
                    └─────┬──────┘
                          ▼
                   PATCH /activities/{id} on Strava API
                          │
                          ▼
                   Log result to Firestore (activity log)
```

---

## 7. Features

### 7.1 Strava OAuth Login

- User visits the app and is prompted to "Login with Strava"
- Standard OAuth 2.0 flow: redirects to Strava, user authorises, callback stores tokens
- Access token and refresh token stored securely in Firestore
- Token auto-refresh handled server-side before any API call
- If the user is not authenticated, all pages redirect to the login screen

---

### 7.2 Strava Webhook Listener

- The app registers a Strava webhook subscription on first setup (or via a setup button in the dashboard)
- Strava sends a `POST` event to `/api/webhooks/strava` whenever:
  - A new activity is **created** (`event_type: "create"`, `object_type: "activity"`)
- The endpoint:
  1. Validates the webhook payload (verify `hub.verify_token`)
  2. Ignores non-activity or non-create events
  3. Fetches the full activity object from the Strava API (using stored tokens)
  4. Triggers the processing pipeline
- Responds with `200 OK` immediately to avoid Strava webhook timeout; processing happens async

---

### 7.3 Activity Processing Pipeline

When a new activity arrives, the following steps execute in order:

#### Step 1 — Fetch Full Activity Data
Retrieve all available fields from `GET /activities/{id}` including:
- `name`, `description`, `type`, `sport_type`
- `distance` (meters), `moving_time`, `elapsed_time`
- `total_elevation_gain`
- `average_speed`, `max_speed`
- `average_heartrate`, `max_heartrate`
- `average_cadence`
- `average_watts`, `max_watts`, `weighted_average_watts` (cycling)
- `kilojoules`
- `start_date_local`, `timezone`
- `start_latlng`, `end_latlng`
- `location_city`, `location_state`, `location_country`
- `achievement_count`, `kudos_count`
- `map` (polyline summary)
- `gear_id`
- `perceived_exertion`
- `calories`

#### Step 2 — Load User Configuration
Read the user's current settings from Firestore.

#### Step 3 — Apply Hide from Home Feed Rules
Evaluate configured rules. If a rule matches, set `hide_from_home: true` in the PATCH payload.

Default rules (configurable):
| Activity Type | Condition | Action |
|---|---|---|
| Ride, VirtualRide, EBikeRide | distance < 5 km | Hide from home feed |
| Run, VirtualRun, TrailRun | distance < 2 km | Hide from home feed |

Rules are fully configurable per activity type with a distance threshold.

#### Step 4 — Generate AI Name (if enabled)
- Send activity data to AI provider with the user's configured prompt template and tone settings
- AI generates a creative/witty activity name
- Falls back to original Strava auto-name if AI call fails

#### Step 5 — Generate AI Description (if enabled)
- Send activity data to AI provider with tone/style configuration
- AI generates a rich description incorporating available stats
- Fields used are configurable per activity type

#### Step 6 — PATCH Activity on Strava
Send a single `PATCH /activities/{id}` with:
- `name` (if AI name enabled)
- `description` (if AI description enabled)  
- `hide_from_home` (if rule matched)

#### Step 7 — Log Result
Write a log entry to Firestore:
- Activity ID, name, type, distance
- Actions taken (what was modified)
- AI prompts used and responses
- Success/failure status
- Timestamp

---

### 7.4 Settings Dashboard

A web UI at `/dashboard` (protected, login required) with the following sections:

#### 7.4.1 General
- Master toggle: **Enable/Disable** automatic processing
- Toggle individual features: AI Name, AI Description, Hide from Home Feed

#### 7.4.2 AI Configuration
- **AI Provider selector**: Groq / Google Gemini
- **API Key input** (stored encrypted in Firestore)
- **Tone / Style**: dropdown or free-text (e.g., "motivational", "humorous", "poetic", "factual")
- **Custom prompt template**: editable text area with placeholders like `{{distance}}`, `{{activity_type}}`, `{{pace}}`, `{{elevation}}`, etc.
- Separate templates for **Name** and **Description**
- Per-activity-type overrides (e.g., different tone for runs vs rides)
- **Test button**: run AI generation against a sample/last activity and preview the output

#### 7.4.3 Hide from Home Feed Rules
- Table of rules, one row per activity type
- Columns: Activity Type | Enabled | Distance Threshold (km)
- User can add/remove rows, toggle rules on/off, and change thresholds
- Default rules pre-populated on first setup

#### 7.4.4 Activity Log
- Paginated table of recently processed activities
- Columns: Date | Activity Name | Type | Distance | Actions Taken | Status
- Expandable row to see: original name, AI-generated name, description, rules matched, raw AI prompt/response
- Filter by status (success / failed) and date range

#### 7.4.5 Strava Connection
- Shows connected Strava account (name, profile picture)
- Webhook status: Registered / Not Registered + Register/Re-register button
- Disconnect / Re-authenticate button

---

### 7.5 Webhook Setup Flow

On first login:
1. App checks if a webhook subscription exists for the user's app
2. If not, prompts the user in the dashboard with a "Register Webhook" button
3. Clicking it calls `POST /api/setup/webhook` which registers the subscription with Strava
4. Webhook URL is `https://<vercel-domain>/api/webhooks/strava`

---

## 8. Data Model (Firestore)

### Collection: `users`
```
users/{userId}
  ├── stravaAthleteId: string
  ├── stravaAccessToken: string (encrypted)
  ├── stravaRefreshToken: string (encrypted)
  ├── stravaTokenExpiresAt: timestamp
  ├── webhookSubscriptionId: string | null
  ├── createdAt: timestamp
  └── updatedAt: timestamp
```

### Collection: `settings`
```
settings/{userId}
  ├── processingEnabled: boolean
  ├── aiNameEnabled: boolean
  ├── aiDescriptionEnabled: boolean
  ├── hideFromHomeFeedEnabled: boolean
  ├── aiProvider: "groq" | "gemini"
  ├── aiApiKey: string (encrypted)
  ├── defaultTone: string
  ├── namePromptTemplate: string
  ├── descriptionPromptTemplate: string
  ├── perActivityTypeOverrides: {
  │     [activityType: string]: {
  │       tone?: string
  │       namePromptTemplate?: string
  │       descriptionPromptTemplate?: string
  │     }
  │   }
  ├── hideRules: [
  │     {
  │       activityType: string,
  │       enabled: boolean,
  │       distanceThresholdKm: number
  │     }
  │   ]
  └── updatedAt: timestamp
```

### Collection: `activity_logs`
```
activity_logs/{logId}
  ├── userId: string
  ├── stravaActivityId: string
  ├── activityName: string (original)
  ├── activityType: string
  ├── distanceMeters: number
  ├── startDate: timestamp
  ├── actionsApplied: {
  │     aiName?: string
  │     aiDescription?: string
  │     hiddenFromHomeFeed?: boolean
  │   }
  ├── aiPromptUsed: string
  ├── aiResponseRaw: string
  ├── patchPayloadSent: object
  ├── status: "success" | "failed" | "skipped"
  ├── errorMessage?: string
  └── processedAt: timestamp
```

---

## 9. API Routes

| Method | Route | Description |
|---|---|---|
| `GET` | `/api/auth/strava` | Initiate Strava OAuth flow |
| `GET` | `/api/auth/callback` | Handle OAuth callback, store tokens |
| `GET` | `/api/auth/logout` | Clear session |
| `GET` | `/api/webhooks/strava` | Strava webhook verification (GET challenge) |
| `POST` | `/api/webhooks/strava` | Receive activity event from Strava |
| `POST` | `/api/setup/webhook` | Register webhook subscription with Strava |
| `DELETE` | `/api/setup/webhook` | Deregister webhook subscription |
| `GET` | `/api/settings` | Fetch user settings |
| `PUT` | `/api/settings` | Update user settings |
| `GET` | `/api/logs` | Fetch paginated activity log |
| `GET` | `/api/logs/:id` | Fetch single log entry detail |
| `POST` | `/api/ai/preview` | Preview AI name/description for a sample activity |

---

## 10. AI Prompt Design

### Default Name Prompt Template
```
You are a creative sports coach. Generate a short, witty, and energetic activity name (max 8 words) for the following Strava activity.

Activity Type: {{activity_type}}
Distance: {{distance_km}} km
Duration: {{duration_min}} minutes
Elevation Gain: {{elevation_m}} m
Average Pace: {{avg_pace}} /km
Time of Day: {{time_of_day}}
Location: {{location}}
Tone: {{tone}}

Respond with only the activity name, nothing else.
```

### Default Description Prompt Template
```
You are a {{tone}} sports commentator. Write a short activity description (2-4 sentences) for the following Strava activity. Use the stats naturally in the narrative. Do not use hashtags.

Activity Type: {{activity_type}}
Distance: {{distance_km}} km
Duration: {{duration_min}} minutes
Elevation Gain: {{elevation_m}} m
Average Heart Rate: {{avg_hr}} bpm
Average Pace: {{avg_pace}} /km
Calories: {{calories}} kcal
Location: {{location}}
Time of Day: {{time_of_day}}

Write the description:
```

Placeholders are resolved at runtime from the fetched Strava activity data.

---

## 11. Error Handling & Reliability

| Scenario | Handling |
|---|---|
| Strava API rate limit hit | Retry with exponential backoff (max 3 retries) |
| AI API call fails | Skip AI step, log warning, still apply other rules |
| Strava token expired | Auto-refresh before any API call |
| Webhook delivery timeout | Respond 200 immediately, process in background |
| Firestore unavailable | Log to Vercel console, return error in log |
| Invalid webhook payload | Return 400, ignore |
| User processing disabled | Acknowledge webhook, skip all processing, log as "skipped" |

---

## 12. Security

- Strava OAuth tokens stored encrypted in Firestore (AES-256)
- AI API keys stored encrypted in Firestore
- Webhook verify token stored as a Vercel environment variable
- All `/api/*` routes (except webhook + auth) require a valid session
- Session managed via `next-auth` or an HTTP-only cookie with a signed JWT
- Vercel environment variables used for all secrets (never committed to code)

---

## 13. Environment Variables

```env
STRAVA_CLIENT_ID=
STRAVA_CLIENT_SECRET=
STRAVA_WEBHOOK_VERIFY_TOKEN=
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=
NEXTAUTH_SECRET=
NEXTAUTH_URL=
ENCRYPTION_KEY=
```

---

## 14. MVP Scope (v1)

### In Scope
- [x] Login with Strava (OAuth)
- [x] Webhook registration and listener
- [x] Fetch full activity data on webhook trigger
- [x] AI-generated activity name
- [x] AI-generated activity description
- [x] Hide from home feed rules (type + distance)
- [x] Settings dashboard (all sections)
- [x] Activity processing log
- [x] Master on/off toggle

### Out of Scope for v1
- [ ] Retroactive bulk processing of past activities
- [ ] Multiple user accounts
- [ ] Mobile app
- [ ] Push notifications
- [ ] Weather data integration
- [ ] Strava segment highlighting in descriptions

---

## 15. Future Considerations (v2+)

- **Retroactive processing**: apply rules to past activities in bulk
- **Weather enrichment**: pull weather data at activity time/location and include in AI prompt
- **Segment callouts**: mention notable Strava segments in the description
- **Photo captions**: AI-generated captions for activity photos
- **Multi-user support**: allow others to connect their Strava accounts
- **Activity type renaming**: auto-correct misclassified activity types
- **Zapier / webhook outbound**: trigger external workflows on activity processing

---

## 16. Open Questions

| # | Question | Status |
|---|---|---|
| 1 | Should failed AI generations retry, or just skip silently? | Open |
| 2 | Should the user be notified (email/push) when processing fails? | Open |
| 3 | Should there be a "dry run" mode that previews changes without applying them? | Open |
| 4 | Should the description replace or append to Strava's existing description? | Open |

---

*End of PRD v1.0*
