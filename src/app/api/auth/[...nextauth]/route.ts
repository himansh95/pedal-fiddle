import { handlers } from '@/auth';
import type { NextRequest } from 'next/server';

// next-auth v5 handlers typed to satisfy Next.js 16 strict RouteHandlerConfig
export const GET = handlers.GET as (req: NextRequest) => Promise<Response>;
export const POST = handlers.POST as (req: NextRequest) => Promise<Response>;
