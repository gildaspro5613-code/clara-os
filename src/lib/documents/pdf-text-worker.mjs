// Separate Node process: no request credentials, no OCR and no PDF mutation.
// The parent enforces input, time, concurrency, heap and output limits.
import { PDFParse } from "pdf-parse";

const MAX_BYTES = 10 * 1024 * 1024;
const MAX_PAGES = 100;
const MAX_CHARACTERS = 200_000;
let parser;
async function main() {
  const chunks = [];
  let bytes = 0;
  for await (const chunk of process.stdin) {
    bytes += chunk.length;
    if (bytes > MAX_BYTES) return { code: "PDF_TOO_LARGE" };
    chunks.push(chunk);
  }
  const data = Buffer.concat(chunks);
  if (!data.subarray(0, 1024).includes(Buffer.from("%PDF-"))) return { code: "PDF_INVALID" };
  parser = new PDFParse({ data, verbosity: 0, isEvalSupported: false, useSystemFonts: false, disableFontFace: true });
  const info = await parser.getInfo();
  if (info.total > MAX_PAGES) return { code: "PDF_TOO_MANY_PAGES" };
  let text = "";
  for (let page = 1; page <= info.total; page++) {
    const result = await parser.getText({ partial: [page], pageJoiner: "", parseHyperlinks: false });
    text += (page > 1 ? "\n" : "") + result.pages.map(item => item.text).join("\n");
    if (text.length > MAX_CHARACTERS) return { code: "DOCUMENT_TOO_LONG" };
  }
  return text.trim() ? { text } : { code: "PDF_NO_TEXT" };
}

let result;
try {
  result = await main();
} catch (error) {
  result = { code: error?.name === "PasswordException" ? "PDF_ENCRYPTED" : "PDF_INVALID" };
} finally {
  await parser?.destroy().catch(() => {});
}
process.stdout.write(JSON.stringify(result));
