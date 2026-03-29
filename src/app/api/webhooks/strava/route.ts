import { after } from 'next/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { processActivity } from '../../../../lib/pipeline/processActivity';

const StravaEventSchema = z.object({
  object_type: z.string(),
  aspect_type: z.string(),
  object_id: z.number(),
  owner_id: z.number(),
  subscription_id: z.number().optional(),
  event_time: z.number().optional(),
  updates: z.record(z.string(), z.unknown()).optional(),
});

/**
 * GET /api/webhooks/strava
 * Responds to Strava hub challenge verification.
 */
export async function GET(req: NextRequest): Promise<Response> {
  const { searchParams } = req.nextUrl;
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token === process.env.STRAVA_WEBHOOK_VERIFY_TOKEN) {
    return NextResponse.json({ 'hub.challenge': challenge });
  }

  return new Response('Forbidden', { status: 403 });
}

/**
 * POST /api/webhooks/strava
 * Receives activity events from Strava.
 * Responds 200 immediately; processing runs async.
 */
export async function POST(req: NextRequest): Promise<Response> {
  // Strava sends the verify token as a header on delivery attempts
  const verifyToken = req.headers.get('x-strava-verify-token');
  if (verifyToken && verifyToken !== process.env.STRAVA_WEBHOOK_VERIFY_TOKEN) {
    return new Response('Forbidden', { status: 403 });
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return new Response('Bad Request', { status: 400 });
  }

  const parsed = StravaEventSchema.safeParse(raw);
  if (!parsed.success) {
    return new Response('Bad Request', { status: 400 });
  }

  const body = parsed.data;

  // Only process activity create events
  if (body.object_type !== 'activity' || body.aspect_type !== 'create') {
    return NextResponse.json({ received: true });
  }

  const activityId = String(body.object_id);
  const ownerId = String(body.owner_id);

  // Use `after()` so the work is guaranteed to complete even after the
  // response is sent — critical in serverless environments where the process
  // may be frozen/killed immediately after returning a response.
  after(async () => {
    try {
      await processActivity(ownerId, activityId);
    } catch (err: unknown) {
      console.error('[webhook] processActivity error:', err);
    }
  });

  return NextResponse.json({ received: true });
}
