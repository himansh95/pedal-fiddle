import axios from 'axios';
import { NonRetryableError, withRetry } from '@/lib/utils/retry';

const GEMINI_MODEL = 'gemini-3.5-flash-lite';
const GEMINI_API_URL =
  `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

/**
 * Calls the Google Gemini API and returns the generated text.
 * Retries on 429 (rate-limit) with exponential back-off.
 * Fails fast on 4xx auth/config errors.
 */
export async function callGemini(prompt: string, apiKey: string): Promise<string> {
  const response = await withRetry(
    () =>
      axios
        .post(
          `${GEMINI_API_URL}?key=${apiKey}`,
          {
            contents: [{ parts: [{ text: prompt }] }],
            // Thinking tokens count toward this budget, so leave headroom.
            generationConfig: { maxOutputTokens: 512 },
          },
          { headers: { 'Content-Type': 'application/json' } },
        )
        .catch((err) => {
          if (axios.isAxiosError(err) && err.response) {
            const { status, data } = err.response;
            // 400/401/403/404 are config errors — don't retry
            if (status === 400 || status === 401 || status === 403 || status === 404) {
              throw new NonRetryableError(
                `Gemini ${status}: ${data?.error?.message ?? JSON.stringify(data)}`,
                err,
              );
            }
            // 429 rate-limit — surface a clear message but still retry
            if (status === 429) {
              throw new Error('Gemini rate limit (429) — retrying…');
            }
          }
          throw err;
        }),
    { maxAttempts: 4, initialDelayMs: 2000, factor: 2 },
  );

  const parts: Array<{ text?: string; thought?: boolean }> =
    response.data.candidates?.[0]?.content?.parts ?? [];
  const text = parts.find((p) => !p.thought && p.text)?.text;
  if (!text) {
    throw new Error('Gemini returned no text output.');
  }

  return text.trim();
}
