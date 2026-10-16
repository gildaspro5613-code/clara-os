import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { chromium } from "playwright";

const origin = process.env.DOCUMENTS_E2E_ORIGIN;
if (!origin || new URL(origin).protocol !== "http:" || !["127.0.0.1", "localhost"].includes(new URL(origin).hostname)) {
  throw new Error("DOCUMENTS_E2E_ORIGIN must target an isolated local Next.js server.");
}
let browser;
before(async () => { browser = await chromium.launch({ executablePath: process.env.DOCUMENTS_E2E_CHROMIUM, headless: true, args: ["--no-sandbox"] }); });
after(async () => { await browser?.close(); });

const folder = { id: "folder-a", name: "Dossier A", mimeType: "application/vnd.google-apps.folder", parentId: "root" };
const pdf = { id: "pdf", name: "Rapport.pdf", mimeType: "application/pdf", parentId: "root" };
async function fixture(handler) {
  const context = await browser.newContext({ locale: "fr-FR" });
  await context.addCookies([{ name: "NEXT_LOCALE", value: "fr", url: origin }]);
  const page = await context.newPage();
  const requests = [];
  await context.route("**/*", async route => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.origin !== new URL(origin).origin) return route.abort();
    if (!url.pathname.startsWith("/api/")) return route.continue();
    if (url.pathname !== "/api/documents") return route.fulfill({ json: { success: false, authenticated: false, connected: false } });
    requests.push(request);
    const response = await handler(url, request);
    return route.fulfill(response ?? { json: { success: true, files: [folder, pdf] } });
  });
  await page.goto(`${origin}/documents`);
  await page.getByText("Rapport.pdf", { exact: true }).waitFor();
  return { page, requests, close: () => context.close() };
}
function article(page, name) { return page.locator("article").filter({ has: page.getByText(name, { exact: true }) }); }

test("browser: folder navigation, breadcrumb and pagination", async () => {
  const h = await fixture(async url => {
    if (url.searchParams.has("folderId")) return { json: { success: true, files: [{ ...pdf, name: "Dans le dossier.pdf" }], nextPageToken: url.searchParams.has("pageToken") ? null : "next" } };
  });
  try {
    await article(h.page, "Dossier A").getByRole("button", { name: "Ouvrir le dossier" }).click();
    await h.page.getByText("Dans le dossier.pdf", { exact: true }).waitFor();
    await h.page.getByRole("button", { name: "Afficher davantage de fichiers et dossiers" }).click();
    await h.page.getByRole("button", { name: "Afficher davantage de fichiers et dossiers" }).waitFor({ state: "hidden" });
    assert.equal(h.requests.at(-1).url().includes("folderId=folder-a"), true);
    assert.equal(h.requests.at(-1).url().includes("pageToken=next"), true);
    assert.equal(await h.page.getByText("Dans le dossier.pdf", { exact: true }).count(), 1);
    await h.page.getByRole("button", { name: "Mon Drive", exact: true }).click();
    await h.page.getByText("Rapport.pdf", { exact: true }).waitFor();
  } finally { await h.close(); }
});
test("browser: search and document reading display text and Brain recommendation", async () => {
  const h = await fixture(async (url,request) => {
    if (request.method()==="POST" && request.postDataJSON()?.action === "read") return { json: { success: true, textContent: "Texte PDF extrait", brain: { recommendation: "Recommandation documentaire" } } };
    if (url.searchParams.get("query")) return { json: { success: true, files: [pdf] } };
  });
  try {
    await h.page.locator('form input[type="text"]').fill("Rapport");
    await h.page.locator('form button[type="submit"]').click();
    await h.page.getByText("Résultats de recherche dans Google Drive : Rapport").waitFor();
    await article(h.page, "Rapport.pdf").getByRole("button", { name: "Lire avec Clara" }).click();
    await h.page.locator("pre").getByText("Texte PDF extrait").waitFor();
    assert.equal(await h.page.getByText("Recommandation documentaire", { exact: true }).isVisible(), true);
  } finally { await h.close(); }
});
test("browser: non-extractible, invalid and oversized PDF errors remain explicit and ignore provider secrets", async () => {
  let code = "PDF_NO_TEXT";
  const h = await fixture(async (url,request) => request.method()==="POST" && request.postDataJSON()?.action === "read" ? { status: 422, json: { success: false, code, message: "PRIVATE_PROVIDER_SECRET" } } : undefined);
  try {
    for (const [next, expected] of [["PDF_NO_TEXT", "PDF sans texte extractible. Aucun OCR n’est effectué."], ["PDF_INVALID", "PDF invalide ou corrompu."], ["PDF_TOO_LARGE", "PDF trop volumineux (10 Mo maximum)."], ["PDF_ENCRYPTED", "PDF protégé par un mot de passe."]]) {
      code = next;
      await article(h.page, "Rapport.pdf").getByRole("button", { name: "Lire avec Clara" }).click();
      await h.page.getByText(expected, { exact: true }).waitFor();
      assert.equal(await h.page.getByText("PRIVATE_PROVIDER_SECRET").count(), 0);
      assert.equal(await h.page.locator("pre").count(), 0);
    }
  } finally { await h.close(); }
});
test("browser: creation and upload use current folder and refresh listing", async () => {
  let created = false;
  let uploaded = false;
  const h = await fixture(async (url, request) => {
    if (request.method() === "POST") {
      if (request.headers()["content-type"].includes("application/json")) {
        assert.equal(request.postDataJSON().parentId, "folder-a");
        assert.equal(request.postDataJSON().name, "Nouveau dossier test");
        created = true;
      } else {
        assert.match(request.postData(), /name="folderId"\r\n\r\nfolder-a/);
        uploaded = true;
      }
      return { json: { success: true } };
    }
    if (url.searchParams.has("folderId")) return { json: { success: true, files: [
      ...(created ? [{ ...folder, id: "new", name: "Nouveau dossier test" }] : []),
      ...(uploaded ? [{ ...pdf, name: "test.txt" }] : []),
    ] } };
  });
  try {
    await article(h.page, "Dossier A").getByRole("button", { name: "Ouvrir le dossier" }).click();
    await h.page.getByRole("button", { name: "Dossier A", exact: true }).waitFor();
    h.page.once("dialog", dialog => dialog.accept("Nouveau dossier test"));
    await h.page.getByRole("button", { name: "Nouveau dossier", exact: true }).click();
    await h.page.getByText("Nouveau dossier test", { exact: true }).waitFor();
    await h.page.locator('input[type="file"]').setInputFiles({ name: "test.txt", mimeType: "text/plain", buffer: Buffer.from("synthetic upload") });
    await h.page.getByText("test.txt", { exact: true }).waitFor();
    assert.equal(created && uploaded, true);
  } finally { await h.close(); }
});
test("browser: move selects a destination, requires confirmation and refreshes", async () => {
  let moved = false;
  const h = await fixture(async (url, request) => {
    if (request.method() === "POST") {
      assert.deepEqual(request.postDataJSON(), { action: "move", fileId: "pdf", destinationId: "folder-a" });
      moved = true;
      return { json: { success: true } };
    }
    if (url.searchParams.has("folderId")) return { json: { success: true, files: [] } };
    if (moved) return { json: { success: true, files: [folder] } };
  });
  try {
    await article(h.page, "Rapport.pdf").getByRole("button", { name: "Déplacer vers un dossier…" }).click();
    const dialog = h.page.getByRole("dialog");
    await dialog.getByRole("button", { name: "Dossier A", exact: true }).click();
    h.page.once("dialog", confirmation => confirmation.accept());
    await dialog.getByRole("button", { name: "Confirmer le déplacement dans ce dossier" }).click();
    await dialog.waitFor({ state: "hidden" });
    await h.page.getByText("Rapport.pdf a été déplacé vers Dossier A.").waitFor();
    assert.equal(moved, true);
    await h.page.getByText("Rapport.pdf", { exact: true }).waitFor({ state: "hidden" });
  } finally { await h.close(); }
});
test("browser: a late folder response cannot overwrite the current folder", async () => {
  let release;
  const delayed = new Promise(resolve => { release = resolve; });
  let started;
  const requested = new Promise(resolve => { started = resolve; });
  const folderB = { ...folder, id: "folder-b", name: "Dossier B" };
  const h = await fixture(async url => {
    if (url.searchParams.get("folderId") === "folder-a") {
      started(); await delayed;
      return { json: { success: true, files: [{ ...pdf, name: "Réponse obsolète.pdf" }] } };
    }
    if (url.searchParams.get("folderId") === "folder-b") return { json: { success: true, files: [{ ...pdf, name: "Réponse actuelle.pdf" }] } };
    return { json: { success: true, files: [folder, folderB, pdf] } };
  });
  try {
    await article(h.page, "Dossier A").getByRole("button", { name: "Ouvrir le dossier" }).click();
    await requested;
    await h.page.getByRole("button", { name: "Mon Drive", exact: true }).click();
    await article(h.page, "Dossier B").getByRole("button", { name: "Ouvrir le dossier" }).click();
    await h.page.getByText("Réponse actuelle.pdf", { exact: true }).waitFor();
    const delivered = h.page.waitForResponse(response => response.url().includes("folderId=folder-a"));
    release(); await delivered;
    assert.equal(await h.page.getByText("Réponse obsolète.pdf", { exact: true }).count(), 0);
    assert.equal(await h.page.getByText("Réponse actuelle.pdf", { exact: true }).isVisible(), true);
  } finally { release(); await h.close(); }
});
