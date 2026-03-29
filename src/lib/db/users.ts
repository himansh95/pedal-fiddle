import { Timestamp } from 'firebase-admin/firestore';
import { db } from '@/lib/firebase';
import type { UserDoc } from '@/lib/types';

const col = () => db.collection('users');

export async function getUser(userId: string): Promise<UserDoc | null> {
  const snap = await col().doc(userId).get();
  return snap.exists ? (snap.data() as UserDoc) : null;
}

export async function updateUser(
  userId: string,
  data: Partial<UserDoc>,
): Promise<void> {
  await col()
    .doc(userId)
    .update({ ...data, updatedAt: Timestamp.now() });
}

export async function setWebhookSubscriptionId(
  userId: string,
  subscriptionId: string | null,
): Promise<void> {
  await updateUser(userId, { webhookSubscriptionId: subscriptionId });
}
