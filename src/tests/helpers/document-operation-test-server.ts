/** Synthetic HTTP boundary only. Never part of the deployed application. */
import { createServer } from "node:http";
import { routeHarness } from "./external-event-route-harness";
import { isolatedPostgres } from "./isolated-postgres";
import { purgeDocumentOperations } from "@/lib/maintenance/document-operations-purge";
import { purgeRouteHarness } from "./document-operations-purge-route-harness";
import { createDocumentOperationStore, operationScopeKey } from "@/lib/external-capabilities/document-operations";

async function main() {
  const { query, runSql } = isolatedPostgres(process.env.DOCUMENT_OPERATION_TEST_CONTAINER);
  // A previously migrated, explicitly isolated test container is mandatory.
  await runSql("SELECT current_database()");
  let finish!: () => void;
  const finished = new Promise<void>((resolve) => { finish = resolve; });
  let notifyDocumentFinished!: () => void;
  const documentFinished = new Promise<void>((resolve) => { notifyDocumentFinished = resolve; });
  let failFirst = false;
  let loseAuthorization = false;
  const route = routeHarness(false, createDocumentOperationStore(query), false, async () => {
    if (failFirst) { failFirst = false; return { success: false, content: "", failureCategory: "provider_timeout" }; }
    await finished;
    return { success: true, content: JSON.stringify({ entities: [], facts: [], ambiguities: [], conflicts: [] }) };
  });
  const maintenance = purgeRouteHarness(() => purgeDocumentOperations(async (strings) =>
    [{ expired_results_cleared: (await runSql(strings[0])).trim() }]), "synthetic-maintenance-credential");
  const server = createServer(async (incoming, outgoing) => {
    try {
      if (incoming.url === "/test/metrics" && incoming.method === "GET") {
        outgoing.setHeader("Content-Type", "application/json");
        outgoing.end(JSON.stringify(route.metrics));
        return;
      }
      if (incoming.url === "/test/lose-next-authorization" && incoming.method === "POST") {
        loseAuthorization = true; outgoing.end("ok"); return;
      }
      if (incoming.url === "/test/fail-first" && incoming.method === "POST") {
        failFirst = true; outgoing.end("ok"); return;
      }
      if (incoming.url === "/test/finish" && incoming.method === "POST") {
        finish(); await documentFinished; outgoing.end("ok"); return;
      }
      if (incoming.url === "/test/expire" && incoming.method === "POST") {
        const chunks: Buffer[] = [];
        for await (const chunk of incoming) chunks.push(Buffer.from(chunk));
        const body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
        if (!body.scope || !/^[a-f0-9]{64}$/.test(body.operationId)) throw new Error("Invalid test operation");
        const key = operationScopeKey(body.scope, "os-workspace");
        await query`UPDATE clara_document_operations SET expires_at = clock_timestamp() - interval '1 second'
          WHERE scope_key = ${key} AND operation_id = ${body.operationId} AND status = 'completed'`;
        const purged = await maintenance.get(new Request("http://127.0.0.1/api/internal/document-operations-purge",
          { headers: { authorization: "Bearer synthetic-maintenance-credential" } }));
        if (purged.status !== 200) throw new Error("Synthetic scheduled purge failed");
        outgoing.end("ok"); return;
      }
      if (incoming.method !== "POST" || !["/api/external/events", "/api/external/document-operations/status", "/api/external/document-operations/recovery"].includes(incoming.url ?? "")) {
        outgoing.writeHead(404); outgoing.end(); return;
      }
      const chunks: Buffer[] = [];
      for await (const chunk of incoming) chunks.push(Buffer.from(chunk));
      const headers = new Headers();
      for (const [name, value] of Object.entries(incoming.headers)) if (value !== undefined) headers.set(name, Array.isArray(value) ? value.join(",") : value);
      const request = new Request("http://127.0.0.1" + incoming.url, { method: "POST", headers, body: Buffer.concat(chunks).toString("utf8") });
      const response = await (incoming.url!.endsWith("/status") ? route.statusPost(request) : incoming.url!.endsWith("/recovery") ? route.recoveryPost(request) : route.post(request));
      if (incoming.url === "/api/external/events" && route.metrics.documentAnalyses > 0) notifyDocumentFinished();
      if (loseAuthorization && incoming.url!.endsWith("/recovery") && JSON.parse(Buffer.concat(chunks).toString("utf8")).action === "authorize" && response.status === 200) {
        loseAuthorization = false; outgoing.destroy(); return; // OS committed; the real HTTP acknowledgement is lost.
      }
      outgoing.writeHead(response.status, Object.fromEntries(response.headers));
      outgoing.end(await response.text());
    } catch {
      outgoing.writeHead(500); outgoing.end(); // Never print request/result/error contents.
    }
  });
  server.listen(0, "127.0.0.1", () => {
    const address = server.address();
    if (address && typeof address !== "string") console.info(JSON.stringify({ test_origin: "http://127.0.0.1:" + address.port }));
  });
  process.on("SIGTERM", () => { finish(); server.closeAllConnections(); server.close(() => process.exit(0)); });
}
main().catch(() => { console.error("Isolated document-operation test server failed."); process.exitCode = 1; });
