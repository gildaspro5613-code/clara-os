import { createHash, randomUUID } from "node:crypto";
import { sql } from "@/lib/core/store/database";
import { canonicalJson } from "./document-operations";

export type EventJob = {
  job_id: string; scope_key: string; product_id: string; os_workspace_id: string;
  fingerprint: string; request: Record<string, unknown> | null; correlation_id: string;
  status: "queued" | "processing" | "completed" | "failed" | "uncertain" | "expired";
  phase: string; owner_token: string; result: Record<string, unknown> | null;
  failure_code: string | null; failure_category: string | null;
};
type Query = (strings: TemplateStringsArray, ...values: unknown[]) => Promise<EventJob[]>;
export const jobFingerprint = (body: unknown) => createHash("sha256").update(canonicalJson(body)).digest("hex");

export class EventJobConflict extends Error {}

export function createEventJobStore(query: Query) {
  const lookup = async (scope: string, id: string) => (await query`SELECT *,
    CASE WHEN expires_at <= clock_timestamp() AND status IN ('completed','failed','queued') THEN 'expired'
      WHEN status = 'processing' AND started_at < clock_timestamp() - interval '10 minutes' THEN 'uncertain' ELSE status END AS status,
    CASE WHEN expires_at <= clock_timestamp() THEN NULL ELSE result END AS result
    FROM clara_external_event_jobs WHERE scope_key = ${scope} AND job_id = ${id}`)[0] ?? null;
  return {
    lookup,
    async enqueue(scope: string, id: string, product: string, workspace: string, body: Record<string, unknown>, correlation: string) {
      const fingerprint = jobFingerprint(body);
      await query`INSERT INTO clara_external_event_jobs
        (scope_key, job_id, product_id, os_workspace_id, fingerprint, request, correlation_id)
        VALUES (${scope}, ${id}, ${product}, ${workspace}, ${fingerprint}, ${JSON.stringify(body)}::jsonb, ${correlation})
        ON CONFLICT (job_id) DO NOTHING`;
      const job = await lookup(scope, id);
      if (!job || job.fingerprint !== fingerprint) throw new EventJobConflict("EVENT_JOB_CONFLICT");
      return job;
    },
    async claim(id: string | null = null) {
      // Unique partial index is the final arbiter for concurrent session claims.
      // A crashed owner is never stolen; uncertain work pins the session.
      const owner = randomUUID();
      try {
        const rows = await query`UPDATE clara_external_event_jobs SET status = 'processing', owner_token = ${owner},
          phase = 'starting', started_at = clock_timestamp(), updated_at = clock_timestamp()
          WHERE job_id = (SELECT j.job_id FROM clara_external_event_jobs j
            WHERE j.status = 'queued' AND j.expires_at > clock_timestamp() AND (${id ?? ''} = '' OR j.job_id = ${id ?? ''})
              AND NOT EXISTS (SELECT 1 FROM clara_external_event_jobs active WHERE active.scope_key = j.scope_key AND active.status IN ('processing','uncertain'))
            ORDER BY j.created_at LIMIT 1 FOR UPDATE SKIP LOCKED) AND status = 'queued' RETURNING *`;
        return rows[0] ?? null;
      } catch (error) {
        if ((error as { code?: string }).code === '23505') return null;
        throw error;
      }
    },
    async progress(job: EventJob, phase: string) {
      await query`UPDATE clara_external_event_jobs SET phase = ${phase}, updated_at = clock_timestamp()
        WHERE job_id = ${job.job_id} AND owner_token = ${job.owner_token} AND status IN ('processing','uncertain')`;
    },
    async completeWithSession(job: EventJob, result: Record<string, unknown>, session: unknown, sessionKey: string) {
      // One database statement commits the result and canonical OS session.
      // A lost acknowledgement is reconciled by lookup; no cognition is replayed.
      await query`WITH owned AS (UPDATE clara_external_event_jobs SET status = 'completed',
          result = ${JSON.stringify(result)}::jsonb, phase = 'completed', updated_at = clock_timestamp()
          WHERE job_id = ${job.job_id} AND owner_token = ${job.owner_token}
            AND status IN ('processing','uncertain') RETURNING job_id)
        INSERT INTO clara_sessions (id, data, updated_at)
          SELECT ${sessionKey}, ${JSON.stringify(session)}::jsonb, clock_timestamp() FROM owned
        ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = EXCLUDED.updated_at`;
      const saved = await lookup(job.scope_key, job.job_id);
      if (saved?.status !== 'completed') throw new Error('EVENT_JOB_COMMIT_REJECTED');
    },
    async complete(job: EventJob, result: Record<string, unknown>) {
      const rows = await query`UPDATE clara_external_event_jobs SET status = 'completed', result = ${JSON.stringify(result)}::jsonb,
        phase = 'completed', updated_at = clock_timestamp() WHERE job_id = ${job.job_id} AND owner_token = ${job.owner_token}
        AND status IN ('processing','uncertain') RETURNING *`;
      if (!rows[0]) throw new Error('EVENT_JOB_COMMIT_REJECTED');
    },
    async fail(job: EventJob, code: string, category: string | null) {
      await query`UPDATE clara_external_event_jobs SET status = 'failed', failure_code = ${code}, failure_category = ${category},
        updated_at = clock_timestamp() WHERE job_id = ${job.job_id} AND owner_token = ${job.owner_token}
        AND status IN ('processing','uncertain')`;
    },
    async pendingDocuments() {
      return query`SELECT * FROM clara_external_event_jobs WHERE status IN ('processing','uncertain')
        AND phase = 'document_registry_pending' ORDER BY created_at LIMIT 20`;
    },
    async maintain() {
      await query`UPDATE clara_external_event_jobs SET status = 'uncertain', updated_at = clock_timestamp()
        WHERE status = 'processing' AND started_at < clock_timestamp() - interval '10 minutes'`;
      // Keep identity/fingerprint tombstones; never erase an ambiguous request.
      await query`UPDATE clara_external_event_jobs SET status = 'expired', request = NULL, result = NULL, updated_at = clock_timestamp()
        WHERE expires_at <= clock_timestamp() AND status IN ('queued','completed','failed')`;
    },
  };
}
export const eventJobs = createEventJobStore(sql as Query);
export function publicJob(job: EventJob) {
  return { jobId: job.job_id, status: job.status, phase: job.phase, correlationId: job.correlation_id,
    result: job.status === 'completed' ? job.result : null, failureCode: job.failure_code, failureCategory: job.failure_category,
    pollAfterSeconds: 5 };
}
