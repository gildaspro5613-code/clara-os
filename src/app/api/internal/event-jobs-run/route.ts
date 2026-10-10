import { timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { eventJobs } from '@/lib/external-capabilities/event-jobs';
import { runEventJob, reconcilePendingDocuments } from '@/lib/external-capabilities/event-job-worker';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  const actual = Buffer.from(request.headers.get('authorization') ?? '');
  const expected = Buffer.from(secret ? `Bearer ${secret}` : '');
  if (!secret || actual.length !== expected.length || !timingSafeEqual(actual, expected))
    return NextResponse.json({ success: false }, { status: 401 });
  try {
    await reconcilePendingDocuments();
    await eventJobs.maintain();
    const executed = await runEventJob();
    return NextResponse.json({ success: true, executed });
  } catch { return NextResponse.json({ success: false, code: 'EVENT_JOB_WORKER_UNAVAILABLE' }, { status: 503 }); }
}
