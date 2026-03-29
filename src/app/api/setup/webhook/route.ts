import axios from 'axios';
import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/getAuthUserId';
import { db } from '@/lib/firebase';

const STRAVA_WEBHOOK_URL = 'https://www.strava.com/api/v3/push_subscriptions';

function getCallbackUrl(): string {
  // STRAVA_WEBHOOK_CALLBACK_URL lets you override the callback URL explicitly.
  // Required for local development — Strava rejects localhost/internal IPs.
  // Use an ngrok (or similar) tunnel URL here, e.g.:
  //   STRAVA_WEBHOOK_CALLBACK_URL=https://abc123.ngrok-free.app/api/webhooks/strava
  if (process.env.STRAVA_WEBHOOK_CALLBACK_URL) {
    return process.env.STRAVA_WEBHOOK_CALLBACK_URL;
  }
  const base = process.env.AUTH_URL ?? process.env.NEXTAUTH_URL ?? 'http://localhost:3000';
  return `${base}/api/webhooks/strava`;
}

/**
 * GET /api/setup/webhook
 * Returns the current webhook subscription ID for the user.
 */
export async function GET(_req: NextRequest): Promise<Response> {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userSnap = await db.collection('users').doc(userId).get();
  const subscriptionId = userSnap.data()?.webhookSubscriptionId ?? null;

  return NextResponse.json({ subscriptionId });
}

/**
 * POST /api/setup/webhook
 * Registers a Strava webhook subscription and stores the subscription ID.
 */
export async function POST(_req: NextRequest): Promise<Response> {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const callbackUrl = getCallbackUrl();
  console.log('[setup/webhook] Registering with callback_url:', callbackUrl);

  try {
    const response = await axios.post(STRAVA_WEBHOOK_URL, {
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      callback_url: callbackUrl,
      verify_token: process.env.STRAVA_WEBHOOK_VERIFY_TOKEN,
    });

    const subscriptionId = String(response.data.id);

    await db.collection('users').doc(userId).update({
      webhookSubscriptionId: subscriptionId,
    });

    return NextResponse.json({ subscriptionId });
  } catch (err: unknown) {
    const msg = axios.isAxiosError(err)
      ? JSON.stringify(err.response?.data)
      : String(err);
    console.error('[setup/webhook] POST error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/**
 * DELETE /api/setup/webhook
 * Deregisters the Strava webhook subscription.
 */
export async function DELETE(_req: NextRequest): Promise<Response> {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userSnap = await db.collection('users').doc(userId).get();
  const subscriptionId = userSnap.data()?.webhookSubscriptionId as string | null;

  if (!subscriptionId) {
    return NextResponse.json({ error: 'No active subscription' }, { status: 404 });
  }

  try {
    await axios.delete(`${STRAVA_WEBHOOK_URL}/${subscriptionId}`, {
      data: {
        client_id: process.env.STRAVA_CLIENT_ID,
        client_secret: process.env.STRAVA_CLIENT_SECRET,
      },
    });

    await db.collection('users').doc(userId).update({
      webhookSubscriptionId: null,
    });

    return NextResponse.json({ deleted: true });
  } catch (err: unknown) {
    const msg = axios.isAxiosError(err)
      ? JSON.stringify(err.response?.data)
      : String(err);
    console.error('[setup/webhook] DELETE error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
