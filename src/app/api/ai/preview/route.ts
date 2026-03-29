import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { callAI } from '@/lib/ai';
import { resolvePrompt } from '@/lib/ai/resolvePrompt';
import { getAuthUserId } from '@/lib/getAuthUserId';
import { getSettings } from '@/lib/db/settings';
import { DEFAULT_DESCRIPTION_PROMPT, DEFAULT_NAME_PROMPT } from '@/lib/defaults';
import type { StravaActivity } from '@/lib/types';

const PreviewSchema = z.object({
  type: z.enum(['name', 'description']),
  template: z.string().optional(),
  tone: z.string().optional(),
  // Fake activity values — all optional, will use sensible defaults
  activityType: z.string().optional(),
  distanceKm: z.number().optional(),
  durationMin: z.number().optional(),
  elevationM: z.number().optional(),
  avgHr: z.number().optional(),
  calories: z.number().optional(),
});

export async function POST(req: NextRequest): Promise<Response> {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = PreviewSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  const settings = await getSettings(userId);
  if (!settings) return NextResponse.json({ error: 'Settings not found' }, { status: 404 });

  const {
    type,
    template,
    tone,
    activityType = 'Ride',
    distanceKm = 25,
    durationMin = 60,
    elevationM = 300,
    avgHr = 145,
    calories = 600,
  } = parsed.data;

  // Construct a fake StravaActivity for preview
  const fakeActivity: StravaActivity = {
    id: 0,
    name: 'Preview Activity',
    type: activityType,
    sport_type: activityType,
    distance: distanceKm * 1000,
    moving_time: durationMin * 60,
    elapsed_time: durationMin * 60,
    total_elevation_gain: elevationM,
    average_speed: distanceKm / (durationMin / 60),
    max_speed: 0,
    average_heartrate: avgHr,
    max_heartrate: avgHr + 15,
    calories,
    start_date_local: new Date().toISOString(),
    timezone: 'UTC',
    achievement_count: 0,
    kudos_count: 0,
  };

  const resolvedTone = tone ?? settings.defaultTone;

  const defaultTemplate =
    type === 'name' ? DEFAULT_NAME_PROMPT : DEFAULT_DESCRIPTION_PROMPT;
  const resolvedTemplate = template ?? (type === 'name'
    ? settings.namePromptTemplate
    : settings.descriptionPromptTemplate) ?? defaultTemplate;

  try {
    const prompt = resolvePrompt(resolvedTemplate, fakeActivity, resolvedTone);
    const output = await callAI(prompt, settings);
    return NextResponse.json({ prompt, output });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
