import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

/**
 * Firebase Admin SDK singleton.
 * Prevents multiple initialisations in Next.js dev hot-reload.
 */
function initFirebase() {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

  // The private key is stored with literal \n in env vars (Vercel / .env.local).
  // We normalise both "\\n" (double-escaped) and "\n" (single) → real newlines.
  const rawKey = process.env.FIREBASE_PRIVATE_KEY ?? '';
  const privateKey = rawKey.includes('\\n')
    ? rawKey.replace(/\\n/g, '\n')
    : rawKey;

  if (!projectId || !clientEmail || !privateKey) {
    const missing = [
      !projectId && 'FIREBASE_PROJECT_ID',
      !clientEmail && 'FIREBASE_CLIENT_EMAIL',
      !privateKey && 'FIREBASE_PRIVATE_KEY',
    ].filter(Boolean).join(', ');
    throw new Error(`Firebase Admin: missing env vars: ${missing}`);
  }

  if (!privateKey.includes('-----BEGIN PRIVATE KEY-----')) {
    throw new Error(
      'Firebase Admin: FIREBASE_PRIVATE_KEY appears malformed — ' +
      'make sure it starts with "-----BEGIN PRIVATE KEY-----" after newline expansion. ' +
      'In .env.local wrap the value in double quotes and use \\n for newlines.',
    );
  }

  return initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
  });
}

try {
  initFirebase();
} catch (err) {
  // Surface the error clearly instead of letting it appear as a cryptic 500
  console.error('[firebase] Admin SDK init failed:', err);
  throw err;
}

export const db = getFirestore();
