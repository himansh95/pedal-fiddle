# Pedal Fiddle 🚴

> Automatically enrich and manage your Strava activities — hands-free.

Pedal Fiddle is a personal web app that hooks into Strava's webhook API to process new activities in near real-time. The moment you finish a ride, run, or workout, it generates an AI-crafted name and description, and applies your configurable privacy rules — all without you lifting a finger.

---

## Table of Contents

- [Background](#background)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [How It Works](#how-it-works)
- [Project Structure](#project-structure)
- [Contributing](#contributing)
- [License](#license)

---

## Background

Strava auto-names activities with boring defaults like "Afternoon Ride". Manually renaming and describing every activity is tedious. Pedal Fiddle solves this by connecting your Strava account once, configuring your preferences, and then running silently in the background — enriching every new activity automatically.

---

## Features

- **AI-generated names & descriptions** — Uses Google Gemini or Groq (free tier) to craft intelligent, data-rich activity titles and write-ups based on distance, pace, elevation, and more.
- **Hide-from-feed rules** — Configurable rules to automatically mark short or low-effort activities as hidden from your public Strava home feed.
- **Real-time processing** — Powered by Strava webhooks; activities are processed within seconds of upload.
- **Activity logs** — Full audit trail of every processed activity, including AI prompts, responses, and applied rules.
- **Settings dashboard** — Clean UI to manage all behaviour without touching any code.
- **Zero ongoing maintenance** — Configure once, let it run.

---

## Tech Stack

| Layer          | Technology                              |
|----------------|-----------------------------------------|
| Frontend       | Next.js 16 (App Router) + React 19      |
| Styling        | Tailwind CSS v4                         |
| Backend        | Next.js API Routes (Node.js serverless) |
| Hosting        | Vercel                                  |
| Database       | Firebase Firestore (free tier)          |
| Authentication | Strava OAuth 2.0 via NextAuth v5        |
| AI Providers   | Google Gemini API / Groq (`llama-3`)    |
| Strava         | Strava API v3 + Webhooks                |

---

## Prerequisites

Before you begin, make sure you have the following:

- **Node.js** v18 or later
- A **Strava account** and a registered [Strava API application](https://www.strava.com/settings/api)
- A **Firebase project** with Firestore enabled (Spark free tier is sufficient)
- A **Google Gemini API key** (free) or a **Groq API key** (free) — or both
- A **Vercel account** for deployment (the Strava webhook requires a public URL)

---

## Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/your-username/pedal-fiddle.git
   cd pedal-fiddle
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up environment variables**

   Copy the example env file and fill in your values:

   ```bash
   cp .env.example .env.local
   ```

   See the [Configuration](#configuration) section for all required variables.

4. **Run the development server**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Configuration

Create a `.env.local` file in the project root with the following variables:

```env
# NextAuth
AUTH_SECRET=your_nextauth_secret            # Generate with: openssl rand -base64 32

# Strava OAuth
STRAVA_CLIENT_ID=your_strava_client_id
STRAVA_CLIENT_SECRET=your_strava_client_secret
STRAVA_WEBHOOK_VERIFY_TOKEN=your_random_token  # Any secret string you choose

# Firebase Admin
FIREBASE_PROJECT_ID=your_firebase_project_id
FIREBASE_CLIENT_EMAIL=your_service_account_email
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# AI Providers (at least one required)
GEMINI_API_KEY=your_gemini_api_key
GROQ_API_KEY=your_groq_api_key

# Encryption (for storing Strava tokens at rest)
ENCRYPTION_KEY=your_32_char_hex_key         # Generate with: openssl rand -hex 32

# App URL (used for webhook registration)
NEXT_PUBLIC_APP_URL=https://your-deployment.vercel.app
```

### Registering the Strava Webhook

After deploying to Vercel, register your webhook subscription from the Settings page in the dashboard, or by calling the setup endpoint directly:

```bash
curl -X POST https://your-deployment.vercel.app/api/setup/webhook
```

---

## Usage

1. **Log in** — Visit the app and click "Login with Strava" to authorise access.
2. **Configure AI settings** — Go to the **AI** page to set your preferred provider and customise the name/description prompt templates. Available placeholders include `{{distance_km}}`, `{{activity_type}}`, `{{avg_pace}}`, and more.
3. **Configure hide rules** — Go to the **Rules** page to set up per-activity-type distance thresholds. Activities below the threshold will be automatically hidden from your Strava home feed.
4. **Upload an activity on Strava** — That's it. Pedal Fiddle handles everything from here.
5. **Review logs** — Visit the **Logs** page to see a full history of processed activities.

---

## How It Works

```
Strava Activity Upload
        |
        v
POST /api/webhooks/strava   <- Strava fires a webhook event
        |
        v
  Fetch full activity from Strava API
        |
        v
  Load user settings from Firestore
        |
      +-+---------------------+
      v                       v
Apply hide rules         Generate AI name
(hide_from_home)         & description
      |                  (Groq / Gemini)
      +----------+-----------+
                 v
      PATCH activity on Strava
                 |
                 v
      Write result to activity_logs
```

1. **Webhook** — Strava sends a `POST` to `/api/webhooks/strava` when a new activity is created.
2. **Pipeline** — `lib/pipeline/processActivity.ts` orchestrates fetching the activity, evaluating rules, calling the AI, and patching Strava.
3. **AI** — Prompt templates are resolved with real activity values, then sent to your configured AI provider.
4. **Logging** — Every run is recorded in Firestore with the full prompt, AI response, and outcome.

---

## Project Structure

```
src/
├── app/
│   ├── api/                  # API routes (webhooks, auth, settings, logs)
│   └── dashboard/            # Dashboard pages (AI, Rules, Logs, Settings)
└── lib/
    ├── ai/                   # Gemini & Groq clients, prompt resolver
    ├── db/                   # Firestore helpers (users, settings, logs)
    ├── pipeline/             # Core activity processing pipeline
    ├── utils/                # Geocoding, retry logic
    ├── defaults.ts           # Default hide rules & prompt templates
    ├── encryption.ts         # AES-256 token encryption
    ├── strava.ts             # Strava API client with auto token refresh
    └── types.ts              # Shared TypeScript types
```

---

## Contributing

This is a personal project, but suggestions and bug reports are welcome.

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m 'Add some feature'`
4. Push to the branch: `git push origin feature/your-feature`
5. Open a Pull Request

Please run `npm run lint` before submitting.

---

## License

This project is for personal use. No license is currently specified — all rights reserved by the author.
