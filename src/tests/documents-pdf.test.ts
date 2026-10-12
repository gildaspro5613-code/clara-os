import test from "node:test";
import assert from "node:assert/strict";
import { Readable } from "node:stream";
import type { drive_v3 } from "googleapis";
import { extractPdfText } from "@/lib/documents/pdf-text";
import { DocumentReadError, MAX_PDF_BYTES } from "@/lib/documents/document-read-error";
import { DriveFiles } from "@/lib/connectors/internal/google/drive/drive-files";
import { syntheticPdf } from "./helpers/synthetic-pdf";
import { readFile } from "node:fs/promises";

function code(expected: string) { return (error: unknown) => error instanceof DocumentReadError && error.code === expected; }
test("real PDF text extraction preserves original bytes", async () => {
  const pdf = syntheticPdf("Clara OS text document");
  const original = Buffer.from(pdf);
  assert.match(await extractPdfText(pdf), /Clara OS text document/);
  assert.deepEqual(pdf, original);
});
test("blank PDF reports no text and never claims OCR", async () => {
  await assert.rejects(extractPdfText(syntheticPdf()), code("PDF_NO_TEXT"));
});
test("invalid PDF is rejected", async () => {
  await assert.rejects(extractPdfText(Buffer.from("not a PDF")), code("PDF_INVALID"));
  await assert.rejects(extractPdfText(Buffer.from("%PDF-1.7\nbroken")), code("PDF_INVALID"));
});
test("encrypted PDF reports password protection", async () => {
  await assert.rejects(extractPdfText(await readFile("src/tests/fixtures/documents/encrypted.pdf")), code("PDF_ENCRYPTED"));
});
test("PDF byte and page limits are enforced", async () => {
  await assert.rejects(extractPdfText(Buffer.alloc(MAX_PDF_BYTES + 1)), code("PDF_TOO_LARGE"));
  await assert.rejects(extractPdfText(syntheticPdf("short", 101)), code("PDF_TOO_MANY_PAGES"));
});
test("PDF extracted character limit is enforced without truncating into success", async () => {
  await assert.rejects(extractPdfText(syntheticPdf("x".repeat(2100), 100)), code("DOCUMENT_TOO_LONG"));
});

function fakeDrive(mimeType: string, content: Buffer, size?: number) {
  const calls: Record<string, unknown>[] = [];
  return { calls, drive: { files: {
    async get(params: Record<string, unknown>, options?: Record<string, unknown>) {
      calls.push(params);
      if (params.alt === "media") { assert.equal(options?.responseType, "stream"); return { data: Readable.from([content]) }; }
      return { data: { id: "document", name: "Synthetic", mimeType, size: size === undefined ? undefined : String(size) } };
    },
    async export(params: Record<string, unknown>) {
      calls.push(params); return { data: Readable.from([content]) };
    },
  } } as unknown as drive_v3.Drive };
}
test("Drive PDF reader uses trusted metadata, streams media and extracts text", async () => {
  const mock = fakeDrive("application/pdf", syntheticPdf("Downloaded from Drive"));
  const result = await new DriveFiles(mock.drive).readContent("document", "text/plain");
  assert.equal(result.mimeType, "application/pdf");
  assert.match(result.textContent, /Downloaded from Drive/);
  assert.equal(mock.calls.length, 2);
});
test("Drive metadata rejects oversized file before downloading", async () => {
  const mock = fakeDrive("application/pdf", Buffer.alloc(0), MAX_PDF_BYTES + 1);
  await assert.rejects(new DriveFiles(mock.drive).readContent("document"), code("DOCUMENT_TOO_LARGE"));
  assert.equal(mock.calls.length, 1);
});
test("Drive stream size limit applies even when metadata size is absent", async () => {
  const mock = fakeDrive("text/plain", Buffer.alloc(2 * 1024 * 1024 + 1));
  await assert.rejects(new DriveFiles(mock.drive).readContent("document"), code("DOCUMENT_TOO_LARGE"));
});
test("Google Docs export text is read and Sheets export uses CSV", async () => {
  for (const mime of ["application/vnd.google-apps.document", "application/vnd.google-apps.spreadsheet"]) {
    const mock = fakeDrive(mime, Buffer.from("Document content"));
    assert.equal((await new DriveFiles(mock.drive).readContent("document")).textContent, "Document content");
    assert.equal(mock.calls[1].mimeType, mime.endsWith("spreadsheet") ? "text/csv" : "text/plain");
  }
});
