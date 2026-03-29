import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/getAuthUserId';
import { getActivityLogs } from '@/lib/db/activityLogs';
import type { ActivityLogDoc } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest): Promise<Response> {
  const userId = await getAuthUserId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '20', 10), 100);
  const cursor = searchParams.get('cursor') ?? undefined;
  const status = searchParams.get('status') as ActivityLogDoc['status'] | null;
  const fromDateStr = searchParams.get('from');
  const toDateStr = searchParams.get('to');

  try {
    const page = await getActivityLogs(userId, {
      limit,
      cursor: cursor || undefined,
      status: status ?? undefined,
      fromDate: fromDateStr ? new Date(fromDateStr) : undefined,
      toDate: toDateStr ? new Date(toDateStr) : undefined,
    });
    return NextResponse.json(page);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[GET /api/logs] error:', msg);
    return NextResponse.json({ error: msg, logs: [], nextCursor: null }, { status: 500 });
  }
}
