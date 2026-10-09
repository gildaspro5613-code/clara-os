import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import ts from "typescript";

export function purgeRouteHarness(purge: () => Promise<number>, secret?: string) {
  const require = createRequire(import.meta.url);
  const logs: Record<string, unknown>[] = [];
  const source = readFileSync(new URL("../../app/api/internal/document-operations-purge/route.ts", import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports: Record<string, unknown> = {};
  const modules: Record<string, unknown> = {
    "next/server": { NextResponse: Response },
    "@/lib/maintenance/document-operations-purge": { purgeDocumentOperations: purge },
  };
  const log = (_label: string, data: string) => logs.push(JSON.parse(data));
  vm.runInNewContext(compiled, { exports, Buffer, performance, process: { env: { CRON_SECRET: secret } },
    require: (name: string) => modules[name] ?? require(name), console: { info: log, warn: log } });
  return { get: exports.GET as (request: Request) => Promise<Response>, logs };
}
