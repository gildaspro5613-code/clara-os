// Legacy business/component tests use an explicit fence mock; they do not validate server authorization.
// See native-authority tests and real HTTP/browser reception for the production boundary.
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import ts from "typescript";
import type { drive_v3 } from "googleapis";
import { DriveFiles } from "@/lib/connectors/internal/google/drive/drive-files";

/** Execute the real Documents handler, replacing only external auth/storage/
 * cognition. The real Drive reader and PDF subprocess are exercised unchanged.
 */
export function documentsRouteHarness(drive: drive_v3.Drive) {
  const received: Array<{ payload: { textContent: string }; type: string }> = [];
  const journal: unknown[] = [];
  const files = new DriveFiles(drive);
  const require = createRequire(import.meta.url);
  const modules: Record<string, unknown> = {
    "@/lib/native/authority": { nativeOperationFence: async () => null },
    "next/server": { NextResponse: Response },
    "@/lib/connectors/internal/google/drive/google-drive-engine": { GoogleDriveEngine: class {
      readContent(context: { fileId: string; mimeType?: string }) { return files.readContent(context.fileId, context.mimeType); }
      list(options: Parameters<DriveFiles["list"]>[0]) { return files.list(options); }
      upload(context: Parameters<DriveFiles["upload"]>[0]) { return files.upload(context); }
      download(context: { fileId: string }) { return files.download(context.fileId); }
    } },
    "@/lib/connectors/internal/google/drive/drive-client": { DriveClient: class { async create() { return drive; } } },
    "@/lib/connectors/google/auth/google-api-error-response": { googleReauthResponse: () => null },
    "@/lib/core/event-bus": { dispatchEvent: async (_runtime: unknown, event: { payload: { textContent: string }; type: string }) => {
      received.push(event); return { recommendation: { summary: "Synthetic Brain recommendation" }, mission: { id: "synthetic-mission" } };
    } },
    "@/lib/core/clara": { Clara: class {} },
    "@/lib/core/runtime": { getRuntime: () => ({}) },
    "@/lib/core/operational-context": { resolveOperationalContext: async () => ({ sessionKey: "default", acquisition: null }) },
    "@/lib/core/store/session-store": { DEFAULT_SESSION_KEY: "default" },
    "@/lib/core/journal": { Journal: class { async addEntry(entry: unknown) { journal.push(entry); } } },
    "@/lib/core/journal-writer": { writeActionEntry: (title: string, detail: string) => ({ title, detail }) },
  };
  const source = readFileSync(new URL("../../app/api/documents/route.ts", import.meta.url), "utf8");
  const exports: Record<string, unknown> = {};
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(compiled, { exports, require: (name: string) => modules[name] ?? require(name), Response, Request, URL, Buffer, File, Blob, TextDecoder, crypto: globalThis.crypto });
  return { get: exports.GET as (request: Request) => Promise<Response>, post: exports.POST as (request: Request) => Promise<Response>, received, journal };
}
