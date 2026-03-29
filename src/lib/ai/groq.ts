import axios from 'axios';
import { NonRetryableError, withRetry } from '@/lib/utils/retry';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'llama-3.3-70b-versatile';

/**
 * Calls the Groq API and returns the generated text.
 * Retries on 429 (rate-limit) with exponential back-off.
 * Fails fast on 4xx auth/config errors.
 */
export async function callGroq(prompt: string, apiKey: string): Promise<string> {
  const response = await withRetry(
    () =>
      axios
        .post(
          GROQ_API_URL,
          {
            model: MODEL,
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 256,
            temperature: 0.8,
          },
          {
            headers: {
              Authorization: `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
          },
        )
        .catch((err) => {
          if (axios.isAxiosError(err) && err.response) {
            const { status, data } = err.response;
            if (status === 400 || status === 401 || status === 403) {
              throw new NonRetryableError(
                `Groq ${status}: ${data?.error?.message ?? JSON.stringify(data)}`,
                err,
              );
            }
            if (status === 429) {
              throw new Error('Groq rate limit (429) — retrying…');
            }
          }
          throw err;
        }),
    { maxAttempts: 4, initialDelayMs: 2000, factor: 2 },
  );

  return response.data.choices[0].message.content.trim();
}
