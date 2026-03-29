import { Timestamp } from 'firebase-admin/firestore';
import { db } from '@/lib/firebase';
import { DEFAULT_DESCRIPTION_PROMPT, DEFAULT_GEAR_RULES, DEFAULT_HIDE_RULES, DEFAULT_NAME_PROMPT } from '@/lib/defaults';
import type { SettingsDoc } from '@/lib/types';

const col = () => db.collection('settings');

export async function getSettings(userId: string): Promise<SettingsDoc | null> {
  const snap = await col().doc(userId).get();
  return snap.exists ? (snap.data() as SettingsDoc) : null;
}

export async function updateSettings(
  userId: string,
  data: Partial<SettingsDoc>,
): Promise<void> {
  await col()
    .doc(userId)
    .update({ ...data, updatedAt: Timestamp.now() });
}

export async function upsertSettings(
  userId: string,
  data: Partial<SettingsDoc>,
): Promise<void> {
  await col()
    .doc(userId)
    .set({ ...data, updatedAt: Timestamp.now() }, { merge: true });
}

/**
 * Seeds default settings for a new user if none exist yet.
 * Called after first successful login.
 */
export async function seedDefaultSettings(userId: string): Promise<void> {
  const existing = await getSettings(userId);
  if (existing) return; // already seeded

  const defaults: SettingsDoc = {
    processingEnabled: true,
    aiNameEnabled: true,
    aiDescriptionEnabled: true,
    hideFromHomeFeedEnabled: true,
    aiProvider: 'groq',
    aiApiKey: '',
    defaultTone: 'motivational',
    namePromptTemplate: DEFAULT_NAME_PROMPT,
    descriptionPromptTemplate: DEFAULT_DESCRIPTION_PROMPT,
    perActivityTypeOverrides: {},
    hideRules: DEFAULT_HIDE_RULES,
    gearRules: DEFAULT_GEAR_RULES,
    updatedAt: Timestamp.now(),
  };

  await col().doc(userId).set(defaults);
}
