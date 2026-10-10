/** Isolated actual-route HTTP fixture. No deployed worker or Production data. */
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
import { routeHarness } from './external-event-route-harness';
import { isolatedPostgres } from './isolated-postgres';
import { createEventJobStore, publicJob, EventJobConflict } from '@/lib/external-capabilities/event-jobs';
import { createDocumentOperationStore, operationScopeKey } from '@/lib/external-capabilities/document-operations';
import { authenticateExternalProduct } from '@/lib/external-capabilities/config';
import { runEventJob, reconcilePendingDocuments } from '@/lib/external-capabilities/event-job-worker';

async function main() {
  const pg = isolatedPostgres(process.env.DOCUMENT_OPERATION_TEST_CONTAINER);
  await pg.runSql('SELECT 1 FROM clara_external_event_jobs LIMIT 1');
  const store = createEventJobStore(pg.query as unknown as Parameters<typeof createEventJobStore>[0]);
  let duration = 0; let providerFail = false; let automatic = true; let executions = 0;
  const route = routeHarness(false, createDocumentOperationStore(pg.query), false, undefined, async () => {
    executions++; await new Promise(resolve => setTimeout(resolve, duration));
    if (providerFail) throw new Error('synthetic-confidential-provider-error');
    return 'Independent business work completed with existing facts.';
  });
  const worker = (id: string | null = null) => runEventJob(id, store, route.execute, () => route.products);
  const pending = new Set<Promise<unknown>>();
  const modules: Record<string, unknown> = {
    'next/server': { NextResponse: Response, after: (fn: () => Promise<unknown>) => {
      if (!automatic) return;
      // Emulate Next's managed post-response callback, not app fire-and-forget.
      const task = new Promise<void>(resolve => setImmediate(resolve)).then(fn);
      pending.add(task); task.finally(() => pending.delete(task));
    } },
    '@/lib/external-capabilities/config': { authenticateExternalProduct: (id: string, auth: string) => authenticateExternalProduct(id, auth, route.products) },
    '@/lib/external-capabilities/document-operations': { operationScopeKey },
    '@/lib/external-capabilities/event-jobs': { eventJobs: store, publicJob, EventJobConflict },
    '@/lib/external-capabilities/event-job-worker': { runEventJob: worker, reconcilePendingDocuments: () => reconcilePendingDocuments(store, createDocumentOperationStore(pg.query)) },
    '@/lib/external-capabilities/external-event-handler': { parseBody: route.parse },
  };
  const require = createRequire(import.meta.url);
  const handlers = new Map<string, (request: Request) => Promise<Response>>();
  for (const [path, file] of [
    ['/api/external/event-jobs', '../../app/api/external/event-jobs/route.ts'],
    ['/api/external/event-jobs/status', '../../app/api/external/event-jobs/status/route.ts'],
    ['/api/internal/event-jobs-run', '../../app/api/internal/event-jobs-run/route.ts'],
  ]) {
    const exports: Record<string, unknown> = {};
    vm.runInNewContext(ts.transpileModule(readFileSync(new URL(file, import.meta.url), 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText,
    { exports, require: (name: string) => modules[name] ?? require(name), crypto: globalThis.crypto, performance, console,
      Buffer, process: { env: { CRON_SECRET: 'synthetic-maintenance-credential' } } });
    handlers.set(path, (exports.POST ?? exports.GET) as (request: Request) => Promise<Response>);
  }
  handlers.set('/api/external/document-operations/status', route.statusPost);
  handlers.set('/api/external/document-operations/recovery', route.recoveryPost);
  handlers.set('/api/external/events', route.post);
  const server = createServer(async (incoming, outgoing) => {
    try {
      const chunks: Buffer[] = []; for await (const chunk of incoming) chunks.push(Buffer.from(chunk));
      const text = Buffer.concat(chunks).toString('utf8');
      if (incoming.url === '/test/config') {
        const config = JSON.parse(text); duration = Math.min(60_000, Math.max(0, config.duration ?? 0));
        providerFail = !!config.fail; automatic = config.automatic !== false;
        outgoing.end('{}'); return;
      }
      if (incoming.url === '/test/metrics') {
        outgoing.setHeader('Content-Type', 'application/json');
        outgoing.end(JSON.stringify({ executions, logs: route.logs, documentAnalyses: route.metrics.documentAnalyses })); return;
      }
      const handler = handlers.get(incoming.url ?? '');
      if (!handler) { outgoing.writeHead(404); outgoing.end(); return; }
      const headers = new Headers(); for (const [key,value] of Object.entries(incoming.headers)) if (value !== undefined) headers.set(key, Array.isArray(value) ? value.join(',') : value);
      const response = await handler(new Request('http://127.0.0.1' + incoming.url, { method: incoming.method, headers, ...(incoming.method === 'POST' ? { body: text } : {}) }));
      // Simulate committed acceptance whose HTTP acknowledgement is lost.
      if (headers.get('x-test-lose-acceptance') === 'true' && incoming.url === '/api/external/event-jobs') { outgoing.destroy(); return; }
      outgoing.writeHead(response.status, Object.fromEntries(response.headers)); outgoing.end(await response.text());
    } catch { outgoing.writeHead(500); outgoing.end(); }
  });
  server.listen(0, '127.0.0.1', () => {
    const address = server.address(); if (address && typeof address !== 'string') console.info(JSON.stringify({ test_origin: 'http://127.0.0.1:' + address.port }));
  });
  process.on('SIGTERM', () => { server.closeAllConnections(); server.close(() => process.exit(0)); });
}
main().catch(() => { console.error('Isolated event-job server failed'); process.exitCode = 1; });
