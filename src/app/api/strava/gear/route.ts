import { NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/getAuthUserId';
import { fetchAthleteGear, getValidAccessToken } from '@/lib/strava';

export const dynamic = 'force-dynamic';

export async function GET(): Promise<Response> {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const accessToken = await getValidAccessToken(userId);
    const gear = await fetchAthleteGear(accessToken);
    console.log(`[strava/gear] fetched ${gear.length} bikes for user ${userId}`);
    return NextResponse.json(gear);
  } catch (err) {
    console.error('[strava/gear] error:', err);
    return NextResponse.json({ error: 'Failed to fetch gear from Strava' }, { status: 502 });
  }
}
