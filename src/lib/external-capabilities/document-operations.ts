import { createHash, randomUUID } from "node:crypto";
import { sql } from "@/lib/core/store/database";

export type DocumentOperationScope = {
  productId: string; workspaceId: string; userId: string; sessionId: string;
};
export type DocumentOperation = {
  scope_key: string; operation_id: string; fingerprint: string; owner_token: string;
  status: "processing" | "completed" | "failed" | "uncertain" | "expired";
  result: Record<string, unknown> | null;
  parent_operation_id?: string;
};

export class DocumentRetryAuthorizationError extends Error {}

type Query = (strings: TemplateStringsArray, ...values: unknown[]) => Promise<DocumentOperation[]>;
export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return "[" + value.map(canonicalJson).join(",") + "]";
  if (value !== null && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return "{" + Object.keys(record).sort().filter((key) => record[key] !== undefined)
      .map((key) => JSON.stringify(key) + ":" + canonicalJson(record[key])).join(",") + "}";
  }
  return JSON.stringify(value);
}
export function operationScopeKey(scope: DocumentOperationScope, osWorkspaceId: string): string {
  return createHash("sha256").update(canonicalJson({ ...scope, osWorkspaceId })).digest("hex");
}
export function operationFingerprint(body: Record<string, unknown>): string {
  const { operationId: _ignored, retryOf: _retry, ...payload } = body;
  void _retry;
  void _ignored;
  return createHash("sha256").update(canonicalJson(payload)).digest("hex");
}

// A single INSERT grants ownership. No expired lease is ever stolen: the
// original invocation may still be running after the client's HTTP timeout.
export function createDocumentOperationStore(query: Query) {
  const lookup = async (scopeKey: string, operationId: string) => {
    await query`UPDATE clara_document_operations
      SET status = CASE WHEN status = 'completed' THEN 'expired' ELSE 'uncertain' END,
          result = NULL, updated_at = clock_timestamp()
      WHERE scope_key = ${scopeKey} AND operation_id = ${operationId}
        AND ((status = 'completed' AND expires_at <= clock_timestamp())
          OR (status = 'processing' AND created_at < clock_timestamp() - interval '15 minutes'))`;
    const rows = await query`SELECT scope_key, operation_id, fingerprint, owner_token,
      CASE WHEN status = 'completed' AND expires_at <= clock_timestamp() THEN 'expired' ELSE status END AS status,
      CASE WHEN status = 'completed' AND expires_at <= clock_timestamp() THEN NULL ELSE result END AS result
      FROM clara_document_operations
      WHERE scope_key = ${scopeKey} AND operation_id = ${operationId}`;
    return rows[0] ?? null;
  };
  const inspect = async (scopeKey: string, operationId: string) => {
    // Pure read: neither expires rows nor converts a stale lease. An expired
    // result is withheld; a stale owner may still complete after this response.
    const rows = await query`SELECT scope_key, operation_id, fingerprint, owner_token,
      CASE WHEN status = 'completed' AND expires_at <= clock_timestamp() THEN 'expired'
        WHEN status = 'processing' AND created_at < clock_timestamp() - interval '15 minutes' THEN 'uncertain' ELSE status END AS status,
      CASE WHEN status = 'completed' AND expires_at <= clock_timestamp() THEN NULL ELSE result END AS result
      FROM clara_document_operations WHERE scope_key = ${scopeKey} AND operation_id = ${operationId}`;
    return rows[0] ?? null;
  };
  const retryId = (scopeKey: string, parentId: string) => createHash("sha256")
    .update("clara-document-retry.v1:" + scopeKey + ":" + parentId).digest("hex");
  return {
    lookup, inspect, retryId,
    async authorizeRetry(scopeKey: string, parentId: string, fingerprint: string, operatorId: string) {
      const childId = retryId(scopeKey, parentId);
      const operatorHash = createHash("sha256").update(operatorId).digest("hex");
      // Failed is terminal: complete() cannot commit from failed. This guarded
      // statement cannot authorize uncertain/processing/completed/expired rows.
      await query`INSERT INTO clara_document_operation_retries
        (scope_key, operation_id, parent_operation_id, fingerprint, operator_hash)
        SELECT scope_key, ${childId}, operation_id, fingerprint, ${operatorHash}
        FROM clara_document_operations WHERE scope_key = ${scopeKey} AND operation_id = ${parentId}
          AND status = 'failed' AND result IS NULL AND fingerprint = ${fingerprint}
        ON CONFLICT (scope_key, parent_operation_id) DO NOTHING`;
      const rows = await query`SELECT * FROM clara_document_operation_retries
        WHERE scope_key = ${scopeKey} AND parent_operation_id = ${parentId} AND fingerprint = ${fingerprint}`;
      if (!rows[0]) throw new Error("Document retry not admissible.");
      return childId;
    },
    async reserveRetry(scopeKey: string, operationId: string, parentId: string, fingerprint: string) {
      if (operationId !== retryId(scopeKey, parentId)) throw new DocumentRetryAuthorizationError("Invalid retry identity.");
      const ownerToken = randomUUID();
      const rows = await query`INSERT INTO clara_document_operations
        (scope_key, operation_id, fingerprint, owner_token, status)
        SELECT a.scope_key, a.operation_id, a.fingerprint, ${ownerToken}, 'processing'
        FROM clara_document_operation_retries a JOIN clara_document_operations p
          ON p.scope_key = a.scope_key AND p.operation_id = a.parent_operation_id
        WHERE a.scope_key = ${scopeKey} AND a.operation_id = ${operationId}
          AND a.parent_operation_id = ${parentId} AND a.fingerprint = ${fingerprint}
          AND p.status = 'failed' AND p.result IS NULL
        ON CONFLICT (scope_key, operation_id) DO NOTHING RETURNING *`;
      if (rows[0]) return { owned: true, operation: rows[0] };
      const operation = await inspect(scopeKey, operationId);
      if (!operation) throw new DocumentRetryAuthorizationError("Document retry not authorized.");
      return { owned: false, operation };
    },
    async reserve(scopeKey: string, operationId: string, fingerprint: string, protectRetries = false) {
      if (protectRetries) {
        const authorized = await query`SELECT * FROM clara_document_operation_retries
          WHERE scope_key = ${scopeKey} AND operation_id = ${operationId}`;
        if (authorized[0]) throw new DocumentRetryAuthorizationError("Retry parent required.");
        // Work Cycle root IDs are the exact event fingerprint. A distinct retry
        // ID cannot bypass its guarded path by omitting retryOf. Existing legacy
        // IDs remain readable/idempotent, but arbitrary new IDs are not admitted.
        if (operationId !== fingerprint) {
          const existing = await inspect(scopeKey, operationId);
          if (!existing) throw new DocumentRetryAuthorizationError("Retry parent required.");
          return { owned: false, operation: existing };
        }
      }
      const ownerToken = randomUUID();
      const rows = await query`INSERT INTO clara_document_operations
        (scope_key, operation_id, fingerprint, owner_token, status)
        VALUES (${scopeKey}, ${operationId}, ${fingerprint}, ${ownerToken}, 'processing')
        ON CONFLICT (scope_key, operation_id) DO NOTHING RETURNING *`;
      if (rows[0]) return { owned: true, operation: rows[0] };
      const operation = await lookup(scopeKey, operationId);
      if (!operation) throw new Error("Document operation reservation unavailable.");
      return { owned: false, operation };
    },
    async complete(operation: DocumentOperation, result: Record<string, unknown>) {
      const rows = await query`UPDATE clara_document_operations
        SET status = 'completed', result = ${JSON.stringify(result)}::jsonb,
            updated_at = clock_timestamp(), expires_at = clock_timestamp() + interval '7 days'
        WHERE scope_key = ${operation.scope_key} AND operation_id = ${operation.operation_id}
          AND owner_token = ${operation.owner_token}::uuid AND status IN ('processing','uncertain')
        RETURNING *`;
      if (!rows[0]) throw new Error("Document operation ownership lost.");
    },
    async fail(operation: DocumentOperation) {
      await query`UPDATE clara_document_operations SET status = 'failed', updated_at = clock_timestamp()
        WHERE scope_key = ${operation.scope_key} AND operation_id = ${operation.operation_id}
          AND owner_token = ${operation.owner_token}::uuid AND status IN ('processing','uncertain')`;
    },
  };
}
export const documentOperations = createDocumentOperationStore(sql);
