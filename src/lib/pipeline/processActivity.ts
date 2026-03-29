import { Timestamp } from 'firebase-admin/firestore';
import { callAI } from '@/lib/ai';
import { resolvePrompt } from '@/lib/ai/resolvePrompt';
import { writeActivityLog } from '@/lib/db/activityLogs';
import { getSettings } from '@/lib/db/settings';
import { fetchActivity, getValidAccessToken, patchActivity } from '@/lib/strava';
import type { ActivityLogDoc, GearRule, SettingsDoc, StravaActivity } from '@/lib/types';

// ─── Step 3: Hide from home feed rules ───────────────────────────────────────

function shouldHide(activity: StravaActivity, settings: SettingsDoc): boolean {
  if (!settings.hideFromHomeFeedEnabled) return false;

  const distanceKm = activity.distance / 1000;
  const type = activity.sport_type ?? activity.type;

  return settings.hideRules.some(
    (rule) => rule.enabled && rule.activityType === type && distanceKm < rule.distanceThresholdKm,
  );
}

// ─── Step 3b: Gear assignment ─────────────────────────────────────────────────

/**
 * Returns the first matching gear rule for an activity, or null if none match.
 * Matching is based on:
 *  1. Rule is enabled
 *  2. Activity's location_city contains the rule's locationCity (case-insensitive)
 *  3. If activityTypes is non-empty, the activity type must be in the list
 */
function resolveGearRule(activity: StravaActivity, settings: SettingsDoc): GearRule | null {
  if (!settings.gearRules?.length) return null;

  const city = (activity.location_city ?? '').toLowerCase();
  const type = activity.sport_type ?? activity.type;

  return (
    settings.gearRules.find((rule) => {
      if (!rule.enabled) return false;
      if (!city.includes(rule.locationCity.toLowerCase())) return false;
      if (rule.activityTypes.length > 0 && !rule.activityTypes.includes(type)) return false;
      return true;
    }) ?? null
  );
}

// ─── Step 4 & 5: AI generation ───────────────────────────────────────────────

function getTone(activity: StravaActivity, settings: SettingsDoc): string {
  const type = activity.sport_type ?? activity.type;
  return settings.perActivityTypeOverrides?.[type]?.tone ?? settings.defaultTone;
}

function getNameTemplate(activity: StravaActivity, settings: SettingsDoc): string {
  const type = activity.sport_type ?? activity.type;
  return (
    settings.perActivityTypeOverrides?.[type]?.namePromptTemplate ??
    settings.namePromptTemplate
  );
}

function getDescTemplate(activity: StravaActivity, settings: SettingsDoc): string {
  const type = activity.sport_type ?? activity.type;
  return (
    settings.perActivityTypeOverrides?.[type]?.descriptionPromptTemplate ??
    settings.descriptionPromptTemplate
  );
}

// ─── Main pipeline ────────────────────────────────────────────────────────────

export async function processActivity(
  userId: string,
  activityId: string,
): Promise<void> {
  // Partial log built up as we go, committed in Step 7
  const logEntry: Partial<ActivityLogDoc> = {
    userId,
    stravaActivityId: activityId,
    aiPromptUsed: '',
    aiResponseRaw: '',
    patchPayloadSent: {},
    actionsApplied: {},
  };

  try {
    // ── Step 1: Fetch full activity ──────────────────────────────────────────
    const accessToken = await getValidAccessToken(userId);
    const activity = await fetchActivity(activityId, accessToken);

    logEntry.activityName = activity.name;
    logEntry.activityType = activity.sport_type ?? activity.type;
    logEntry.distanceMeters = activity.distance;
    logEntry.startDate = Timestamp.fromDate(new Date(activity.start_date_local));

    // ── Step 2: Load settings ────────────────────────────────────────────────
    const settings = await getSettings(userId);

    if (!settings) {
      logEntry.status = 'skipped';
      logEntry.errorMessage = 'No settings found for user';
      await writeActivityLog(logEntry as Omit<ActivityLogDoc, 'processedAt'>);
      return;
    }

    if (!settings.processingEnabled) {
      logEntry.status = 'skipped';
      await writeActivityLog(logEntry as Omit<ActivityLogDoc, 'processedAt'>);
      return;
    }

    const patch: Record<string, unknown> = {};
    const actionsApplied: ActivityLogDoc['actionsApplied'] = {};
    const prompts: string[] = [];
    const responses: string[] = [];

    // ── Step 3: Hide from home feed ──────────────────────────────────────────
    if (shouldHide(activity, settings)) {
      patch.hide_from_home = true;
      actionsApplied.hiddenFromHomeFeed = true;
    }

    // ── Step 3b: Gear assignment ─────────────────────────────────────────────
    const gearRule = resolveGearRule(activity, settings);
    if (gearRule) {
      patch.gear_id = gearRule.gearId;
      actionsApplied.gearId = gearRule.gearId;
      actionsApplied.gearLabel = gearRule.label;
      console.log(`[pipeline] Gear rule matched: "${gearRule.label}" (${gearRule.gearId}) for city "${activity.location_city}"`);
    }

    const tone = getTone(activity, settings);

    // ── Step 4: AI name ──────────────────────────────────────────────────────
    if (settings.aiNameEnabled) {
      try {
        const namePrompt = resolvePrompt(getNameTemplate(activity, settings), activity, tone);
        prompts.push(`[NAME]\n${namePrompt}`);
        const aiName = await callAI(namePrompt, settings);
        patch.name = aiName;
        actionsApplied.aiName = aiName;
        responses.push(`[NAME]\n${aiName}`);
      } catch (err) {
        console.warn('[pipeline] AI name failed, using original:', err);
        patch.name = activity.name; // fallback
        responses.push('[NAME] fallback to original');
      }
    }

    // ── Step 5: AI description ───────────────────────────────────────────────
    if (settings.aiDescriptionEnabled) {
      try {
        const descPrompt = resolvePrompt(getDescTemplate(activity, settings), activity, tone);
        prompts.push(`[DESC]\n${descPrompt}`);
        const aiDesc = await callAI(descPrompt, settings);
        patch.description = aiDesc;
        actionsApplied.aiDescription = aiDesc;
        responses.push(`[DESC]\n${aiDesc}`);
      } catch (err) {
        console.warn('[pipeline] AI description failed, skipping:', err);
        responses.push('[DESC] failed, skipped');
      }
    }

    // ── Step 6: PATCH activity on Strava ─────────────────────────────────────
    if (Object.keys(patch).length > 0) {
      await patchActivity(activityId, accessToken, patch as Parameters<typeof patchActivity>[2]);
    }

    logEntry.actionsApplied = actionsApplied;
    logEntry.patchPayloadSent = patch;
    logEntry.aiPromptUsed = prompts.join('\n\n');
    logEntry.aiResponseRaw = responses.join('\n\n');
    logEntry.status = 'success';
  } catch (err) {
    console.error('[pipeline] processActivity error:', err);
    logEntry.status = 'failed';
    logEntry.errorMessage = err instanceof Error ? err.message : String(err);
  }

  // ── Step 7: Log result ────────────────────────────────────────────────────
  await writeActivityLog(logEntry as Omit<ActivityLogDoc, 'processedAt'>);
}
