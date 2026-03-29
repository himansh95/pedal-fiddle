import axios from 'axios';
import { Timestamp } from 'firebase-admin/firestore';
import { decrypt, encrypt } from './encryption';
import { db } from './firebase';
import { StravaActivity, StravaTokenResponse, UserDoc } from './types';
import { NonRetryableError, withRetry } from './utils/retry';

// Mark 4xx errors (except 429) as non-retryable
function handleAxiosError(err: unknown): never {
  if (axios.isAxiosError(err) && err.response) {
    const status = err.response.status;
    if (status >= 400 && status < 500 && status !== 429) {
      throw new NonRetryableError(`Strava API ${status}: ${JSON.stringify(err.response.data)}`, err);
    }
  }
  throw err;
}

const STRAVA_TOKEN_URL = 'https://www.strava.com/oauth/token';
const STRAVA_API_BASE = 'https://www.strava.com/api/v3';

// ─── Token management ─────────────────────────────────────────────────────────

/**
 * Returns a valid (possibly refreshed) Strava access token for the given user.
 * If the stored token is expired or about to expire (< 5 min), it refreshes automatically.
 */
export async function getValidAccessToken(userId: string): Promise<string> {
  const userRef = db.collection('users').doc(userId);
  const snap = await userRef.get();

  if (!snap.exists) {
    throw new Error(`User ${userId} not found in Firestore.`);
  }

  const user = snap.data() as UserDoc;
  const expiresAt = user.stravaTokenExpiresAt.toDate();
  const now = new Date();
  const fiveMinutes = 5 * 60 * 1000;

  // Token is still valid
  if (expiresAt.getTime() - now.getTime() > fiveMinutes) {
    return decrypt(user.stravaAccessToken);
  }

  // Refresh the token
  const refreshToken = decrypt(user.stravaRefreshToken);

  const response = await withRetry(() =>
    axios.post<StravaTokenResponse>(STRAVA_TOKEN_URL, {
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }).catch(handleAxiosError)
  );

  const { access_token, refresh_token, expires_at } = response.data;

  // Persist the new tokens
  await userRef.update({
    stravaAccessToken: encrypt(access_token),
    stravaRefreshToken: encrypt(refresh_token),
    stravaTokenExpiresAt: Timestamp.fromMillis(expires_at * 1000),
    updatedAt: Timestamp.now(),
  });

  return access_token;
}

// ─── Activity API ─────────────────────────────────────────────────────────────

/**
 * Fetches a full activity object from the Strava API.
 */
export async function fetchActivity(
  activityId: string | number,
  accessToken: string,
): Promise<StravaActivity> {
  const response = await withRetry(() =>
    axios.get<StravaActivity>(
      `${STRAVA_API_BASE}/activities/${activityId}`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    ).catch(handleAxiosError)
  );
  return response.data;
}

/**
 * PATCHes a Strava activity with the provided fields.
 */
export async function patchActivity(
  activityId: string | number,
  accessToken: string,
  payload: { name?: string; description?: string; hide_from_home?: boolean; gear_id?: string; [key: string]: unknown },
): Promise<void> {
  await withRetry(() =>
    axios.put(`${STRAVA_API_BASE}/activities/${activityId}`, payload, {
      headers: { Authorization: `Bearer ${accessToken}` },
    }).catch(handleAxiosError)
  );
}

/**
 * Fetches the authenticated athlete's profile.
 */
export async function fetchAthlete(
  accessToken: string,
): Promise<{ id: number; firstname: string; lastname: string; profile: string }> {
  const response = await withRetry(() =>
    axios.get(`${STRAVA_API_BASE}/athlete`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    }).catch(handleAxiosError)
  );
  return response.data;
}
