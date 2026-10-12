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
test("archive endpoint rejects product credentials without an OS session", async () => {
  for (const token of ["invalid", "synthetic-product-token"]) {
    const request = new Request("https://os.example.test/api/documents/live-archives", {
      method:"POST",headers:{authorization:`Bearer ${token}`,"content-type":"application/json"},body:JSON.stringify(syntheticArchive),
    });
    assert.equal((await POST(request)).status,401);
    assert.equal((await GET(new Request("https://os.example.test/api/documents/live-archives?clientId=synthetic-client",{headers:{authorization:`Bearer ${token}`}}))).status,401);
  }
  const cookie = "clara_auth_session=" + "a".repeat(43);
  const crossOrigin = new Request("https://os.example.test/api/documents/live-archives",{method:"POST",headers:{cookie,Origin:"https://evil.test","content-type":"application/json"},body:"{}"});
  assert.equal((await POST(crossOrigin)).status,403);
});
