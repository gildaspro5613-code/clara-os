import { documentOperations, operationScopeKey } from "./document-operations";
import { loadExternalProducts } from "./config";
import { eventJobs, type EventJob } from "./event-jobs";
import { executeExternalEvent, parseBody } from "./external-event-handler";

export async function runEventJob(id: string | null = null, store = eventJobs,
  execute = executeExternalEvent, products = loadExternalProducts) {
  const job = await store.claim(id);
  if (!job) return false;
  const started = performance.now();
  console.info("External job", JSON.stringify({ job_id: job.job_id, correlation_id: job.correlation_id, event: "claimed" }));
  try {
    const product = products().get(job.product_id);
    const body = parseBody(job.request);
    if (!product || product.workspaceId !== job.os_workspace_id || !body || body.scope?.productId !== job.product_id) {
      await store.fail(job, "EVENT_JOB_AUTHORIZATION_CHANGED", null); return true;
    }
    let persisted = false;
    const response = await execute({ product, body, correlationId: job.correlation_id, jobId: job.job_id,
      progress: (phase) => store.progress(job, phase),
      persist: async (data, session, key) => { await store.completeWithSession(job, data, session, key); persisted = true; } });
    const payload = await response.json();
    if (response.status === 200 && payload.success && payload.data) { if (!persisted) await store.complete(job, payload.data); }
    else if (response.status === 202) {
      // An existing document invocation owns the analysis. Do not execute or
      // invent success: retained phase allows reconciliation with its registry.
      await store.progress(job, 'document_registry_pending');
    } else {
      const code = ['DOCUMENT_ANALYSIS_FAILED','CORE_EVENT_PROCESSING_FAILED','DOCUMENT_RETRY_AUTHORIZATION_REQUIRED','DOCUMENT_OPERATION_CONFLICT'].includes(payload.code)
        ? payload.code : 'EVENT_JOB_EXECUTION_FAILED';
      const categories = ['missing_segments','provider_auth','provider_rate_limit','provider_timeout','provider_connection','provider_server','provider_request','provider_unknown','output_truncated','output_filtered','provider_incomplete','provider_failed','empty_output','invalid_json','invalid_structure'];
      await store.fail(job, code, categories.includes(payload.failureCategory) ? payload.failureCategory : null);
    }
  } catch {
    // Storage/call ambiguity may include committed effects. Never retry blindly,
    // and do not overwrite a completed result as failed after a lost DB ack.
    try { await store.progress(job, 'reconciliation_required'); } catch { /* durable owner remains */ }
  } finally {
    console.info("External job", JSON.stringify({ job_id: job.job_id, correlation_id: job.correlation_id,
      event: 'invocation_end', duration_ms: Math.round(performance.now() - started) }));
  }
  return true;
}
// Reconcile existing document ownership/results, never dispatch it again.
export async function reconcilePendingDocuments(store = eventJobs, registry = documentOperations) {
  for (const job of await store.pendingDocuments()) {
    const body = parseBody(job.request);
    if (!body?.scope || !body.operationId) continue;
    const existing = await registry.inspect(operationScopeKey(body.scope, job.os_workspace_id), body.operationId);
    if (existing?.status === 'completed' && existing.result) await store.complete(job, existing.result);
    else if (existing?.status === 'failed') await store.fail(job, 'DOCUMENT_OPERATION_FAILED', null);
  }
}
// Type exported for isolated HTTP/SQL integration fixtures.
export type { EventJob };
