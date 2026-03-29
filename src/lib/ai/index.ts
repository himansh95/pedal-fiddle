import { decrypt } from '@/lib/encryption';
import type { SettingsDoc } from '@/lib/types';
import { callGemini } from './gemini';
import { callGroq } from './groq';

/**
 * Calls the configured AI provider and returns the generated text.
 * The stored apiKey is AES-256-GCM encrypted — decrypted here before use.
 */
export async function callAI(prompt: string, settings: SettingsDoc): Promise<string> {
  const apiKey = settings.aiApiKey ? decrypt(settings.aiApiKey) : '';

  if (!apiKey) {
    throw new Error('No AI API key configured. Add one in the dashboard.');
  }

  if (settings.aiProvider === 'gemini') {
    return callGemini(prompt, apiKey);
  }

  return callGroq(prompt, apiKey);
}
