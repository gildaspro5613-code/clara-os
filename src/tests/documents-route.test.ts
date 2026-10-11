import test from "node:test";
import assert from "node:assert/strict";
import { Readable } from "node:stream";
import type { drive_v3 } from "googleapis";
import { documentsRouteHarness } from "./helpers/documents-route-harness";
import { syntheticPdf } from "./helpers/synthetic-pdf";

function fixture(content: Buffer, mimeType = "application/pdf", size = content.length) {
  return documentsRouteHarness({ files: {
    async get(params: { alt?: string }) { return { data: params.alt === "media" ? Readable.from([content]) : { id: "synthetic", name: "Synthetic", mimeType, size: String(size) } }; },
    async export() { return { data: Readable.from([content]) }; },
  } } as unknown as drive_v3.Drive);
}
const request = () => new Request("https://os.example.test/api/documents?action=read&fileId=synthetic&fileName=Report");
test("Documents read route sends actual extracted PDF text to DOCUMENT_RECEIVED and returns Brain result", async () => {
  const h = fixture(syntheticPdf("Real PDF extraction through the Documents API"));
  const response = await h.get(request());
  const result = await response.json();
  assert.equal(response.status, 200);
  assert.match(result.textContent, /Real PDF extraction/);
  assert.equal(h.received[0].type, "DOCUMENT_RECEIVED");
  assert.equal(h.received[0].payload.textContent, result.textContent);
  assert.equal(result.brain.missionId, "synthetic-mission");
  assert.equal(h.journal.length, 1);
});
test("Documents read route exports Google Docs and dispatches its extracted text", async () => {
  const h = fixture(Buffer.from("Google document body"), "application/vnd.google-apps.document");
  assert.equal((await h.get(request())).status, 200);
  assert.equal(h.received[0].payload.textContent, "Google document body");
});
test("invalid, non-extractible and oversized documents return explicit errors without Brain dispatch", async () => {
  for (const [content, size, status, code] of [
    [syntheticPdf(), 1000, 422, "PDF_NO_TEXT"],
    [Buffer.from("invalid PDF"), 1000, 422, "PDF_INVALID"],
    [Buffer.alloc(0), 11 * 1024 * 1024, 413, "DOCUMENT_TOO_LARGE"],
  ] as const) {
    const h = fixture(content, "application/pdf", size);
    const response = await h.get(request());
    assert.equal(response.status, status);
    assert.equal((await response.json()).code, code);
    assert.equal(h.received.length, 0);
    assert.equal(h.journal.length, 0);
  }
});
test("Documents mutations reject malformed, unsupported and oversized requests before provider calls", async () => {
  const h = fixture(Buffer.alloc(0));
  for (const body of ["null", "{", JSON.stringify({ action: "unknown" }), JSON.stringify({ action: "createFolder", parentId: 42 })]) {
    const response = await h.post(new Request("https://os.example.test/api/documents", { method: "POST", headers: { "content-type": "application/json" }, body }));
    assert.equal(response.status, 400);
  }
  const oversized = new Request("https://os.example.test/api/documents", { method: "POST", headers: { "content-type": "application/json" }, body: "x".repeat(64 * 1024 + 1) });
  assert.equal((await h.post(oversized)).status, 413);
  const multipart = new Request("https://os.example.test/api/documents", { method: "POST", headers: { "content-type": "multipart/form-data; boundary=test", "content-length": String(21 * 1024 * 1024) }, body: "small" });
  assert.equal((await h.post(multipart)).status, 413);
  for (const contentType of ["text/plain", "multipart/form-data"]) {
    assert.equal((await h.post(new Request("https://os.example.test/api/documents", { method: "POST", headers: { "content-type": contentType }, body: "invalid" }))).status, 400);
  }
});
test("Documents POST routes create, upload and move through existing Drive services", async () => {
  const mutations: Array<Record<string, unknown>> = [];
  const h = documentsRouteHarness({ files: {
    async get(params: { fileId: string }) {
      return { data: params.fileId === "file" ? { id: "file", name: "Source", parents: ["root"], mimeType: "text/plain" } : { id: params.fileId, mimeType: "application/vnd.google-apps.folder" } };
    },
    async create(params: Record<string, unknown>) {
      mutations.push(params);
      const body = params.requestBody as { name: string };
      return { data: { id: "created", name: body.name, mimeType: "text/plain" } };
    },
    async update(params: Record<string, unknown>) { mutations.push(params); return { data: {} }; },
  } } as unknown as drive_v3.Drive);
  const post = (body: unknown) => h.post(new Request("https://os.example.test/api/documents", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }));
  assert.equal((await post({ action: "createFolder", name: "New", parentId: "folder" })).status, 200);
  const form = new FormData();
  form.set("file", new File(["synthetic upload"], "upload.txt", { type: "text/plain" }));
  form.set("folderId", "folder");
  const uploaded = await h.post(new Request("https://os.example.test/api/documents", { method: "POST", body: form }));
  assert.equal(uploaded.status, 201);
  assert.equal((await uploaded.json()).file.name, "upload.txt");
  assert.deepEqual((mutations[1].requestBody as { parents: string[] }).parents, ["folder"]);
  assert.equal((await post({ action: "move", fileId: "file", destinationId: "folder" })).status, 200);
  assert.equal(mutations[2].addParents, "folder");
  assert.equal(mutations[2].removeParents, "root");
  assert.equal(h.journal.length, 2);
});
