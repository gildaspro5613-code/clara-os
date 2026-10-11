import test from "node:test";
import assert from "node:assert/strict";
import type { drive_v3 } from "googleapis";
import { DriveFiles } from "@/lib/connectors/internal/google/drive/drive-files";
import { createDriveFolder, moveDriveResource, DRIVE_FOLDER_MIME } from "@/lib/documents/drive-workspace";
import { Readable } from "node:stream";

function driveHarness() {
  const records: Record<string, drive_v3.Schema$File> = {
    root: { id: "root", mimeType: DRIVE_FOLDER_MIME },
    folder: { id: "folder", name: "Folder", mimeType: DRIVE_FOLDER_MIME, parents: ["root"] },
    child: { id: "child", name: "Child", mimeType: DRIVE_FOLDER_MIME, parents: ["folder"] },
    file: { id: "file", name: "Document", mimeType: "text/plain", parents: ["root"] },
  };
  const mutations: Record<string, unknown>[] = [];
  const calls: Record<string, unknown>[] = [];
  const drive = { files: {
    async get(params: { fileId: string }) { if (!records[params.fileId]) throw new Error("Not found"); return { data: records[params.fileId] }; },
    async create(params: Record<string, unknown>) {
      mutations.push(params);
      const body = params.requestBody as { name: string; mimeType: string; parents: string[] };
      if (params.media) {
        const chunks = [];
        for await (const chunk of (params.media as { body: Readable }).body) chunks.push(chunk);
        assert.equal(Buffer.concat(chunks).toString(), "uploaded content");
      }
      return { data: { id: "new", name: body.name, mimeType: body.mimeType } };
    },
    async update(params: Record<string, unknown>) { mutations.push(params); return { data: {} }; },
    async list(params: Record<string, unknown>) {
      calls.push(params);
      return { data: params.pageToken ? { files: [records.child] } : { files: [records.folder], nextPageToken: "page2" } };
    },
  } } as unknown as drive_v3.Drive;
  return { drive, records, mutations, calls };
}
test("folder creation verifies parent and retains actual parent ID", async () => {
  const h = driveHarness();
  assert.deepEqual(await createDriveFolder(h.drive, "  New folder  ", "folder"), { id: "new", name: "New folder" });
  assert.deepEqual(h.mutations[0].requestBody, { name: "New folder", mimeType: DRIVE_FOLDER_MIME, parents: ["folder"] });
  await assert.rejects(createDriveFolder(h.drive, "Bad", "file"));
  await assert.rejects(createDriveFolder(h.drive, " "));
  assert.equal(h.mutations.length, 1);
});
test("file and folder moves update parents without deleting originals", async () => {
  const h = driveHarness();
  await moveDriveResource(h.drive, "file", "folder");
  await moveDriveResource(h.drive, "child", "root");
  assert.equal(h.mutations[0].addParents, "folder");
  assert.equal(h.mutations[0].removeParents, "root");
  assert.equal(h.mutations[1].addParents, "root");
  assert.equal(h.mutations[1].removeParents, "folder");
});
test("self, child cycle, same-parent and non-folder moves never mutate", async () => {
  const h = driveHarness();
  for (const [source, destination] of [["folder", "folder"], ["folder", "child"], ["child", "folder"], ["folder", "file"]]) {
    await assert.rejects(moveDriveResource(h.drive, source, destination));
  }
  assert.equal(h.mutations.length, 0);
});
test("pagination passes folder query and opaque page token to Drive", async () => {
  const h = driveHarness();
  const files = new DriveFiles(h.drive);
  const query = "'folder' in parents and trashed = false";
  const first = await files.list({ query });
  const next = await files.list({ query, pageToken: first.nextPageToken });
  assert.equal(first.nextPageToken, "page2");
  assert.equal(next.files[0].fileId, "child");
  assert.equal(h.calls[1].q, query);
  assert.equal(h.calls[1].pageToken, "page2");
});
test("upload streams content into the current folder", async () => {
  const h = driveHarness();
  await new DriveFiles(h.drive).upload({ fileName: "test.txt", folderId: "folder", mimeType: "text/plain", content: Buffer.from("uploaded content") });
  assert.deepEqual((h.mutations[0].requestBody as { parents: string[] }).parents, ["folder"]);
});
