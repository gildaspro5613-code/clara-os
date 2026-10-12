import test from "node:test";
import assert from "node:assert/strict";
import { GET, POST } from "@/app/api/documents/live-archives/route";
import { parseLiveArchiveReference, LiveArchiveValidationError } from "@/lib/documents/live-archive-reference";

export const syntheticArchive = {
  version: "clara.live-archive-reference.v1", workspaceId: "synthetic-os", clientId: "synthetic-client",
  projectId: "synthetic-project", liveProjectId: "synthetic-live", productId: "clara-live", status: "archived",
  archivedAt: "2026-10-11T10:00:00Z", displayName: "Synthetic archived project",
  sourceUrl: "https://live.example.test/projects/synthetic-live",
};
test("archive validation rejects malformed contract, dates, IDs and source URLs", () => {
  for (const change of [
    { version: "bad" }, { archivedAt: "2026-02-30T10:00:00Z" }, { clientId: "" },
    { projectId: "control\ncharacter" }, { sourceUrl: "not a URL" }, { sourceUrl: "https://user:password@example.test" },
    { status: "active" }, { productId: "clara-os" },
  ]) assert.throws(() => parseLiveArchiveReference({ ...syntheticArchive, ...change }), LiveArchiveValidationError);
});
test("archive timestamps normalize equivalent instants", () => {
  assert.deepEqual(parseLiveArchiveReference(syntheticArchive), parseLiveArchiveReference({ ...syntheticArchive, archivedAt: "2026-10-11T12:00:00+02:00" }));
});
test("archive endpoint rejects invalid auth and keeps client/project authorization locked", async () => {
  const names = ["CLARA_LIVE_PRODUCT_TOKEN", "CLARA_LIVE_WORKSPACE_ID", "CLARA_LIVE_CAPABILITIES", "CLARA_LIVE_CALLBACK_BASE_URL", "CLARA_EXTERNAL_PRODUCTS_JSON"];
  const previous = names.map(name => process.env[name]);
  try {
    process.env.CLARA_LIVE_PRODUCT_TOKEN = "synthetic-token";
    process.env.CLARA_LIVE_WORKSPACE_ID = "synthetic-os";
    process.env.CLARA_LIVE_CAPABILITIES = "[]";
    delete process.env.CLARA_LIVE_CALLBACK_BASE_URL;
    delete process.env.CLARA_EXTERNAL_PRODUCTS_JSON;
    const request = (body: unknown, token = "synthetic-token") => new Request("https://os.example.test/api/documents/live-archives", {
      method: "POST", headers: { authorization: `Bearer ${token}`, "content-type": "application/json" }, body: JSON.stringify(body),
    });
    assert.equal((await POST(request(syntheticArchive, "invalid"))).status, 401);
    assert.equal((await POST(request({ ...syntheticArchive, workspaceId: "other-workspace" }))).status, 403);
    assert.equal((await POST(request(syntheticArchive))).status, 403);
    assert.equal((await POST(request({ ...syntheticArchive, clientId: "other-client" }))).status, 403);
    assert.equal((await POST(request({ ...syntheticArchive, projectId: "other-project" }))).status, 403);
    assert.equal((await POST(request({ ...syntheticArchive, version: "unsupported" }))).status, 400);
    assert.equal((await POST(request({ ...syntheticArchive, sourceUrl: "bad" }))).status, 400);
    assert.equal((await GET(new Request("https://os.example.test/api/documents/live-archives?clientId=synthetic-client"))).status, 401);
    for (const clientId of ["synthetic-client", "other-client"]) {
      assert.equal((await GET(new Request(`https://os.example.test/api/documents/live-archives?clientId=${clientId}`, {
        headers: { authorization: "Bearer synthetic-token" },
      }))).status, 403);
    }
    const malformed = new Request("https://os.example.test/api/documents/live-archives", { method: "POST", headers: { authorization: "Bearer synthetic-token" }, body: "{" });
    assert.equal((await POST(malformed)).status, 400);
  } finally {
    names.forEach((name, index) => { if (previous[index] === undefined) delete process.env[name]; else process.env[name] = previous[index]; });
  }
});
