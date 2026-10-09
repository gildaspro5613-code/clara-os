import { createHash, randomUUID } from "node:crypto";
import { sql } from "@/lib/core/store/database";

export type DocumentOperationScope = {
  productId: string; workspaceId: string; userId: string; sessionId: string;
};
export type DocumentOperation = {
  scope_key: string; operation_id: string; fingerprint: string; owner_token: string;
  status: "processing" | "completed" | "failed" | "uncertain" | "expired";
  result: Record<string, unknown> | null;
};

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
  const { operationId: _ignored, ...payload } = body;
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
  return {
    lookup,
    async reserve(scopeKey: string, operationId: string, fingerprint: string) {
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
