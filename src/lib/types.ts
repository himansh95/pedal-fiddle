import type { Timestamp } from 'firebase-admin/firestore';

// ─── Firestore document shapes ────────────────────────────────────────────────

export interface UserDoc {
  stravaAthleteId: string;
  stravaAccessToken: string; // encrypted
  stravaRefreshToken: string; // encrypted
  stravaTokenExpiresAt: Timestamp;
  webhookSubscriptionId: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface HideRule {
  activityType: string;
  enabled: boolean;
  distanceThresholdKm: number;
}

export interface GearRule {
  id: string; // unique rule id (uuid)
  enabled: boolean;
  label: string; // friendly name, e.g. "Bhopal Bike"
  gearId: string; // Strava gear id, e.g. "b12345678"
  /** Match by location city substring (case-insensitive). e.g. "bhopal" */
  locationCity: string;
  /** Optional: restrict to specific activity types. Empty = all types. */
  activityTypes: string[];
}

export interface PerActivityTypeOverride {
  tone?: string;
  namePromptTemplate?: string;
  descriptionPromptTemplate?: string;
}

export interface SettingsDoc {
  processingEnabled: boolean;
  aiNameEnabled: boolean;
  aiDescriptionEnabled: boolean;
  hideFromHomeFeedEnabled: boolean;
  aiProvider: 'groq' | 'gemini';
  aiApiKey: string; // encrypted
  defaultTone: string;
  namePromptTemplate: string;
  descriptionPromptTemplate: string;
  perActivityTypeOverrides: Record<string, PerActivityTypeOverride>;
  hideRules: HideRule[];
  gearRules: GearRule[];
  updatedAt: Timestamp;
}

export interface ActivityActionsApplied {
  aiName?: string;
  aiDescription?: string;
  hiddenFromHomeFeed?: boolean;
  gearId?: string;
  gearLabel?: string;
}

export interface ActivityLogDoc {
  userId: string;
  stravaActivityId: string;
  activityName: string; // original
  activityType: string;
  distanceMeters: number;
  startDate: Timestamp;
  actionsApplied: ActivityActionsApplied;
  aiPromptUsed: string;
  aiResponseRaw: string;
  patchPayloadSent: Record<string, unknown>;
  status: 'success' | 'failed' | 'skipped';
  errorMessage?: string;
  processedAt: Timestamp;
  /** City resolved for gear matching (may come from Strava or reverse geocoding) */
  locationResolved?: string;
}

// ─── Strava API shapes ────────────────────────────────────────────────────────

export interface StravaTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_at: number; // unix seconds
  athlete: StravaAthlete;
}

export interface StravaAthlete {
  id: number;
  firstname: string;
  lastname: string;
  profile: string; // profile picture URL
  username: string;
}

export interface StravaActivity {
  id: number;
  name: string;
  description?: string;
  type: string;
  sport_type: string;
  distance: number; // metres
  moving_time: number; // seconds
  elapsed_time: number; // seconds
  total_elevation_gain: number;
  average_speed: number;
  max_speed: number;
  average_heartrate?: number;
  max_heartrate?: number;
  average_cadence?: number;
  average_watts?: number;
  max_watts?: number;
  weighted_average_watts?: number;
  kilojoules?: number;
  start_date_local: string;
  timezone: string;
  start_latlng?: [number, number];
  end_latlng?: [number, number];
  location_city?: string;
  location_state?: string;
  location_country?: string;
  achievement_count: number;
  kudos_count: number;
  map?: { summary_polyline: string };
  gear_id?: string;
  perceived_exertion?: number;
  calories?: number;
}
