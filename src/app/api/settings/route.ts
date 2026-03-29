import { NextRequest, NextResponse } from 'next/server';
import { encrypt } from '@/lib/encryption';
import { getAuthUserId } from '@/lib/getAuthUserId';
import { getSettings, seedDefaultSettings, upsertSettings } from '@/lib/db/settings';
import { SettingsDoc } from '@/lib/types';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest): Promise<Response> {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Seed defaults if missing (first-login race condition), then read in one pass
  let settings = await getSettings(userId);
  if (!settings) {
    await seedDefaultSettings(userId);
    settings = await getSettings(userId);
  }
  if (!settings) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Decrypt API key before sending to client (show masked version)
  const safeSettings = {
    ...settings,
    aiApiKey: settings.aiApiKey ? '••••••••' : '',
  };

  return NextResponse.json(safeSettings);
}

const HideRuleSchema = z.object({
  activityType: z.string(),
  enabled: z.boolean(),
  distanceThresholdKm: z.number().positive(),
});

const GearRuleSchema = z.object({
  id: z.string(),
  enabled: z.boolean(),
  label: z.string(),
  gearId: z.string(),
  locationCity: z.string(),
  activityTypes: z.array(z.string()),
});

const SettingsSchema = z.object({
  processingEnabled: z.boolean().optional(),
  aiNameEnabled: z.boolean().optional(),
  aiDescriptionEnabled: z.boolean().optional(),
  hideFromHomeFeedEnabled: z.boolean().optional(),
  aiProvider: z.enum(['groq', 'gemini']).optional(),
  aiApiKey: z.string().optional(),
  defaultTone: z.string().optional(),
  namePromptTemplate: z.string().optional(),
  descriptionPromptTemplate: z.string().optional(),
  perActivityTypeOverrides: z.record(z.string(), z.object({
    tone: z.string().optional(),
    namePromptTemplate: z.string().optional(),
    descriptionPromptTemplate: z.string().optional(),
  })).optional(),
  hideRules: z.array(HideRuleSchema).optional(),
  gearRules: z.array(GearRuleSchema).optional(),
});

export async function PUT(req: NextRequest): Promise<Response> {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = SettingsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  const data = parsed.data as Partial<SettingsDoc>;

  // Encrypt the API key if a new one was provided (not masked placeholder)
  if (data.aiApiKey && data.aiApiKey !== '••••••••') {
    data.aiApiKey = encrypt(data.aiApiKey);
  } else {
    delete data.aiApiKey; // don't overwrite with placeholder
  }

  await upsertSettings(userId, data);
  return NextResponse.json({ ok: true });
}
