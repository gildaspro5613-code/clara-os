import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import ts from "typescript";
import { authenticateExternalProduct, ExternalProductConfigurationError } from "@/lib/external-capabilities/config";
import { documentOperations, operationScopeKey, operationFingerprint } from "@/lib/external-capabilities/document-operations";

export function routeHarness(failDispatch = false, store = documentOperations, failSession = false,
  generate?: () => Promise<{ success: boolean; content: string; responseStatus?: "completed" | "incomplete" | "failed" | "other"; incompleteReason?: "max_output_tokens" | "content_filter" | "other"; failureCategory?: "provider_timeout" | "provider_auth" | "provider_rate_limit"; providerHttpStatus?: number; outputTokens?: number }>) {
  const metrics = { documentAnalyses: 0 };
  const products = new Map([
    ["clara-live", { productId: "clara-live", workspaceId: "os-workspace", token: "test-credential", capabilities: [] }],
    ["other-product", { productId: "other-product", workspaceId: "other-os-workspace", token: "other-test-credential", capabilities: ["existing-grant"] }],
  ]);
  const received: Record<string, unknown>[] = [];
  const workspaces: string[] = [];
  const logs: Record<string, unknown>[] = [];
  const require = createRequire(import.meta.url);
  const modules: Record<string, unknown> = {
    "@/lib/external-capabilities/document-operations": { documentOperations: store, operationScopeKey, operationFingerprint },
    "next/server": { NextResponse: Response },
    "@/lib/external-capabilities/config": { ExternalProductConfigurationError,
      authenticateExternalProduct: (id: string | null, auth: string | null) => authenticateExternalProduct(id, auth, products) },
    "@/lib/core/clara": { Clara: class { constructor(_key: string, workspace: string) { workspaces.push(workspace); } } },
    "@/lib/core/event-bus": { dispatchEvent: async (_clara: unknown, event: Record<string, unknown>) => {
      if (failDispatch) throw new Error("confidential-downstream-error");
      received.push(event); return { conversation: [], sources: [], state: "WORKING" };
    } },
    "@/lib/brain/response-composer": { composeClaraResponse: async () => "Contract accepted." },
    "@/lib/core/store/session-store": { saveSession: async () => { if (failSession) throw new Error("private-storage-error"); } },
    "@/lib/connectors/internal/openai/responses/openai-responses-engine": { OpenAIResponsesEngine: class { async generate() { metrics.documentAnalyses += 1; if (generate) return generate(); return { success: true, content: JSON.stringify({ entities: [], facts: [], ambiguities: [], conflicts: [] }) }; } } },
    "@/types": { EventType: { USER_MESSAGE: "USER_MESSAGE", DOCUMENT_RECEIVED: "DOCUMENT_RECEIVED" } },
  };
  // Execute the actual route, substituting only downstream cognition/storage.
  // No production credentials, database, network or second validator copy.
  const source = readFileSync(new URL("../../app/api/external/events/route.ts", import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports: Record<string, unknown> = {};
  vm.runInNewContext(compiled, { exports, require: (name: string) => modules[name] ?? require(name),
    Response, crypto: globalThis.crypto, performance, process: { env: {} },
    console: { ...console, info: (_label: string, data: string) => logs.push(JSON.parse(data)) } });
  const statusSource = readFileSync(new URL("../../app/api/external/document-operations/status/route.ts", import.meta.url), "utf8");
  const statusExports: Record<string, unknown> = {};
  vm.runInNewContext(ts.transpileModule(statusSource, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText,
    { exports: statusExports, require: (name: string) => modules[name] ?? require(name) });
  return { post: exports.POST as (request: Request) => Promise<Response>,
    statusPost: statusExports.POST as (request: Request) => Promise<Response>, received, workspaces, logs, metrics };
}

