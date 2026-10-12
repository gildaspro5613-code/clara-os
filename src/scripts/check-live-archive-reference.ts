import assert from "node:assert/strict";
import { liveArchiveReferenceKey, parseLiveArchiveReference, LIVE_ARCHIVE_REFERENCE_VERSION } from "../lib/documents/live-archive-reference";

const valid = {
  version: LIVE_ARCHIVE_REFERENCE_VERSION,
  workspaceId: "workspace-1",
  clientId: "client-1",
  projectId: "project-1",
  liveProjectId: "live-1",
  productId: "clara-live",
  status: "archived",
  archivedAt: "2026-10-11T10:30:00.000Z",
  displayName: "Concert test",
  sourceUrl: "https://live.example.test/projects/live-1",
};

const parsed = parseLiveArchiveReference(valid);
assert.equal(parsed.liveProjectId, valid.liveProjectId);
assert.equal(parsed.status, "archived");
assert.equal(liveArchiveReferenceKey(parsed), liveArchiveReferenceKey(parseLiveArchiveReference({ ...valid, displayName: "Renamed" })));

for (const input of [
  { ...valid, workspaceId: "" },
  { ...valid, archivedAt: "not-a-date" },
  { ...valid, archivedAt: "2026-99-99T00:00:00Z" },
  { ...valid, sourceUrl: "http://live.example.test" },
  { ...valid, status: "active" },
  { ...valid, productId: "clara-os" },
  { ...valid, liveProjectId: "" },
]) {
  assert.throws(() => parseLiveArchiveReference(input));
}
console.log("Live archive reference contract checks passed");
