import { NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/getAuthUserId';
import { fetchAthleteGear, getValidAccessToken } from '@/lib/strava';

export const dynamic = 'force-dynamic';

export async function GET(): Promise<Response> {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const accessToken = await getValidAccessToken(userId);
  const gear = await fetchAthleteGear(accessToken);

  return NextResponse.json(gear);
}
