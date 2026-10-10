import { after, NextResponse } from "next/server";
import { authenticateExternalProduct } from "@/lib/external-capabilities/config";
import { operationScopeKey } from "@/lib/external-capabilities/document-operations";
import { eventJobs, publicJob, EventJobConflict } from "@/lib/external-capabilities/event-jobs";
import { runEventJob } from "@/lib/external-capabilities/event-job-worker";
import { parseBody } from "@/lib/external-capabilities/external-event-handler";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
// after() shares this bounded Vercel invocation budget. PostgreSQL + Cron,
// rather than this notification, are the source of execution durability.
export const maxDuration = 300;
export async function POST(request: Request) {
  const started = performance.now();
  let phaseStarted = started;
  let phase = "authentication";
  let jobId: string | null = null;
  let httpStatus: number | null = null;
  let exitCode: string | null = null;
  const incoming = request.headers.get('x-clara-correlation-id');
  const correlation = incoming && /^[a-f0-9]{32}$/.test(incoming) ? incoming : crypto.randomUUID().replaceAll('-','');
  const respond = (body: object, options: {status: number; headers?: Record<string,string>}) => {
    httpStatus = options.status;
    exitCode = (body as {code?: string}).code ?? (httpStatus === 200 ? 'EVENT_JOB_COMPLETED' : 'EVENT_JOB_ACCEPTED');
    return NextResponse.json(body, {...options, headers: {'Cache-Control':'no-store', ...options.headers}});
  };
  const advance = (next: string) => {
    console.info("External job acceptance", JSON.stringify({job_id: jobId, correlation_id: correlation,
      phase, event: 'phase_end', code: 'PHASE_COMPLETED', duration_ms: Math.round(performance.now() - phaseStarted)}));
    phase = next; phaseStarted = performance.now();
  };
  try {
    const product = authenticateExternalProduct(request.headers.get('x-clara-product'), request.headers.get('authorization'));
    if (!product) return respond({ success: false, code: 'UNAUTHORIZED' }, { status: 401 });
    if (product.productId !== 'clara-live') return respond({ success: false, code: 'PRODUCT_NOT_ELIGIBLE' }, { status: 403 });
    advance("body_validation");
    const text = await request.text();
    if (Buffer.byteLength(text) > 1_000_000) return respond({ success: false, code: 'EVENT_JOB_TOO_LARGE' }, { status: 413 });
    let input;
    try { input = JSON.parse(text); } catch { return respond({ success: false, code: 'INVALID_EVENT_JOB' }, { status: 400 }); }
    if (!input || typeof input !== "object" || Array.isArray(input)) return respond({ success: false, code: "INVALID_EVENT_JOB" }, { status: 400 });
    const body = parseBody(input.event);
    if (!body?.scope || typeof input.jobId !== 'string' || !/^[a-f0-9]{64}$/.test(input.jobId) || !['USER_MESSAGE','LIVE_DOCUMENT_ANALYSIS_REQUESTED'].includes(body.eventType ?? ''))
      return respond({ success: false, code: 'INVALID_EVENT_JOB' }, { status: 400 });
    if (body.scope.productId !== product.productId) return respond({ success: false, code: 'SCOPE_MISMATCH' }, { status: 403 });
    jobId = input.jobId;
    advance("job_persistence");
    const job = await eventJobs.enqueue(operationScopeKey(body.scope, product.workspaceId), input.jobId,
      product.productId, product.workspaceId, body as Record<string, unknown>, correlation);
    console.info("External job acceptance", JSON.stringify({ job_id: job.job_id, correlation_id: job.correlation_id,
      event: "accepted", status: job.status, duration_ms: Math.round(performance.now() - started) }));
    if (job.status === 'queued') after(() => runEventJob(job.job_id).then(() => undefined).catch(() => { console.warn("External job notification failed", JSON.stringify({job_id: job.job_id, code: "EVENT_JOB_NOTIFICATION_FAILED"})); }));
    return respond({ success: true, data: publicJob(job) }, { status: job.status === 'completed' ? 200 : 202,
      headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    const conflict = error instanceof EventJobConflict;
    return respond({ success: false, code: conflict ? 'EVENT_JOB_CONFLICT' : 'EVENT_JOB_UNAVAILABLE' }, { status: conflict ? 409 : 503 });
  } finally {
    console.info("External job acceptance", JSON.stringify({ job_id: jobId, correlation_id: correlation, event: 'phase_end',
      phase, http_status: httpStatus, code: exitCode, duration_ms: Math.round(performance.now() - phaseStarted) }));
  }
}
