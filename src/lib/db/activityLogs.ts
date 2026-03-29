import { Timestamp } from 'firebase-admin/firestore';
import { db } from '@/lib/firebase';
import type { ActivityLogDoc } from '@/lib/types';

const col = () => db.collection('activity_logs');

export async function writeActivityLog(
  log: Omit<ActivityLogDoc, 'processedAt'>,
): Promise<string> {
  const ref = await col().add({
    ...log,
    processedAt: Timestamp.now(),
  });
  return ref.id;
}

export interface LogPage {
  logs: (ActivityLogDoc & { id: string })[];
  nextCursor: string | null;
}

export async function getActivityLogs(
  userId: string,
  options: {
    limit?: number;
    cursor?: string;
    status?: ActivityLogDoc['status'];
    fromDate?: Date;
    toDate?: Date;
  } = {},
): Promise<LogPage> {
  const { limit = 20, cursor, status, fromDate, toDate } = options;

  let query = col()
    .where('userId', '==', userId)
    .orderBy('processedAt', 'desc')
    .limit(limit + 1); // fetch one extra to detect next page

  if (status) {
    query = query.where('status', '==', status);
  }
  if (fromDate) {
    query = query.where('processedAt', '>=', Timestamp.fromDate(fromDate));
  }
  if (toDate) {
    query = query.where('processedAt', '<=', Timestamp.fromDate(toDate));
  }
  if (cursor) {
    const cursorSnap = await col().doc(cursor).get();
    if (cursorSnap.exists) {
      query = query.startAfter(cursorSnap);
    }
  }

  const snap = await query.get();
  const docs = snap.docs;
  const hasMore = docs.length > limit;
  const page = hasMore ? docs.slice(0, limit) : docs;

  return {
    logs: page.map((d) => ({ id: d.id, ...(d.data() as ActivityLogDoc) })),
    nextCursor: hasMore ? page[page.length - 1].id : null,
  };
}

export async function getActivityLog(
  logId: string,
): Promise<(ActivityLogDoc & { id: string }) | null> {
  const snap = await col().doc(logId).get();
  if (!snap.exists) return null;
  return { id: snap.id, ...(snap.data() as ActivityLogDoc) };
}
