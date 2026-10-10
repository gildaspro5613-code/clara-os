"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowLeft, Brain, Download, ExternalLink, FileText, Folder, FolderPlus, Search, Upload } from "lucide-react";

import MainLayout from "@/components/layout/MainLayout";

interface DocumentFile {
  id: string;
  name: string;
  mimeType?: string;
  url?: string;
  parentId?: string | null;
}

interface DocumentsResponse {
  success: boolean;
  files?: DocumentFile[];
  nextPageToken?: string | null;
  message?: string;
  extractable?: boolean;
  textContent?: string;
  brain?: { recommendation?: string | null; missionId?: string | null };
}

export default function DocumentsPage() {
  const router = useRouter();
  const t = useTranslations("documents");
  const tp = useTranslations("pages");
  const fileInput = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState("");
  const [folderTrail, setFolderTrail] = useState<{ id: string; name: string }[]>([]);
  const [selected, setSelected] = useState<{ name: string; content: string; recommendation?: string | null } | null>(null);
  const [files, setFiles] = useState<DocumentFile[]>([]);
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);
  const [destinationPageToken, setDestinationPageToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [working, setWorking] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [moveTarget, setMoveTarget] = useState<DocumentFile | null>(null);
  const [destinationTrail, setDestinationTrail] = useState<{ id: string; name: string }[]>([]);
  const [destinations, setDestinations] = useState<DocumentFile[]>([]);
  const [destinationLoading, setDestinationLoading] = useState(false);

  async function loadDocuments(search = "", folderId = folderTrail.at(-1)?.id ?? "") {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (search) params.set("query", search);
      else if (folderId) params.set("folderId", folderId);
      const response = await fetch(`/api/documents?${params}`, { cache: "no-store" });
      const data = (await response.json()) as DocumentsResponse;
      if (!response.ok || !data.success) throw new Error(data.message ?? t("loadError"));
      setFiles(data.files ?? []);
      setNextPageToken(data.nextPageToken ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("loadError"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadDocuments(); }, []);

  async function loadMore() {
    if (!nextPageToken || loading) return;
    try {
      setLoading(true);
      const params = new URLSearchParams({ pageToken: nextPageToken });
      if (query.trim()) params.set("query", query.trim());
      else if (folderTrail.length) params.set("folderId", folderTrail[folderTrail.length - 1].id);
      const response = await fetch(`/api/documents?${params}`, { cache: "no-store" });
      const data = await response.json() as DocumentsResponse;
      if (!response.ok || !data.success) throw new Error(data.message ?? "Chargement impossible.");
      setFiles(prev => [...prev, ...(data.files ?? []).filter(file => !prev.some(existing => existing.id === file.id))]);
      setNextPageToken(data.nextPageToken ?? null);
    } catch (err) { setError(err instanceof Error ? err.message : "Chargement impossible."); }
    finally { setLoading(false); }
  }


  function openFolder(file: DocumentFile) {
    const next = [...folderTrail, { id: file.id, name: file.name }];
    setFolderTrail(next);
    setQuery("");
    void loadDocuments("", file.id);
  }

  function navigateTo(index: number) {
    const next = folderTrail.slice(0, index + 1);
    setFolderTrail(next);
    setQuery("");
    void loadDocuments("", next.at(-1)?.id ?? "");
  }

  async function createFolder() {
    const name = window.prompt("Nom du nouveau dossier :")?.trim();
    if (!name) return;
    try {
      setWorking("create"); setError(null);
      const response = await fetch("/api/documents", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "createFolder", name, parentId: folderTrail.at(-1)?.id }) });
      const data = await response.json() as DocumentsResponse;
      if (!response.ok || !data.success) throw new Error(data.message ?? "Création impossible.");
      await loadDocuments("", folderTrail.at(-1)?.id ?? "");
    } catch (err) { setError(err instanceof Error ? err.message : "Création impossible."); }
    finally { setWorking(null); }
  }

  async function browseDestination(folderId = "", pageToken?: string) {
    setDestinationLoading(true);
    try {
      const params = new URLSearchParams();
      if (folderId) params.set("folderId", folderId);
      if (pageToken) params.set("pageToken", pageToken);
      const response = await fetch(`/api/documents?${params}`, { cache: "no-store" });
      const data = await response.json() as DocumentsResponse;
      if (!response.ok || !data.success) throw new Error(data.message ?? "Impossible de consulter les dossiers.");
      const folders = (data.files ?? []).filter(item => item.mimeType === "application/vnd.google-apps.folder");
      setDestinations(prev => pageToken ? [...prev, ...folders.filter(folder => !prev.some(existing => existing.id === folder.id))] : folders);
      setDestinationPageToken(data.nextPageToken ?? null);
    } catch (err) { setError(err instanceof Error ? err.message : "Impossible de consulter les dossiers."); }
    finally { setDestinationLoading(false); }
  }

  function startMove(file: DocumentFile) {
    setMoveTarget(file);
    setDestinationTrail([]);
    void browseDestination();
  }

  async function confirmMove() {
    const destination = destinationTrail.at(-1);
    const file = moveTarget;
    if (!destination || !file || destination.id === file.parentId) return;
    if (!window.confirm(`Déplacer « ${file.name} » vers « ${destination.name} » ?`)) return;
    try {
      setWorking(`move:${file.id}`); setError(null);
      const response = await fetch("/api/documents", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "move", fileId: file.id, destinationId: destination.id }),
      });
      const data = await response.json() as DocumentsResponse;
      if (!response.ok || !data.success) throw new Error(data.message ?? "Déplacement impossible.");
      setMoveTarget(null);
      setStatus(`${file.name} a été déplacé vers ${destination.name}.`);
      await loadDocuments(query.trim());
    } catch (err) { setError(err instanceof Error ? err.message : "Déplacement impossible."); }
    finally { setWorking(null); }
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void loadDocuments(query.trim());
  }

  async function handleUpload(file?: File) {
    if (!file) return;
    try {
      setWorking("upload");
      setStatus(null);
      setError(null);
      const body = new FormData();
      body.set("file", file);
      if (folderTrail.length) body.set("folderId", folderTrail[folderTrail.length - 1].id);
      const response = await fetch("/api/documents", { method: "POST", body });
      const data = (await response.json()) as DocumentsResponse;
      if (!response.ok || !data.success) throw new Error(data.message ?? "Import impossible.");
      setStatus(`${file.name} a été importé dans Google Drive.`);
      await loadDocuments(query.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import impossible.");
    } finally {
      setWorking(null);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  async function handleAnalyze(file: DocumentFile) {
    try {
      setWorking(`read:${file.id}`);
      setStatus(null);
      setError(null);
      const params = new URLSearchParams({ action: "read", fileId: file.id, fileName: file.name });
      if (file.mimeType) params.set("mimeType", file.mimeType);
      const response = await fetch(`/api/documents?${params.toString()}`, { cache: "no-store" });
      const data = (await response.json()) as DocumentsResponse;
      if (!response.ok || !data.success) throw new Error(data.message ?? "Lecture impossible.");
      setSelected({ name: file.name, content: data.textContent ?? "", recommendation: data.brain?.recommendation });
      setStatus(data.brain?.recommendation
        ? `Clara a lu ${file.name}. ${data.brain.recommendation}`
        : `Clara a lu ${file.name} et l’a transmis au Brain.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lecture impossible.");
    } finally {
      setWorking(null);
    }
  }

  function downloadHref(file: DocumentFile) {
    const params = new URLSearchParams({ action: "download", fileId: file.id, fileName: file.name });
    if (file.mimeType) params.set("mimeType", file.mimeType);
    return `/api/documents?${params.toString()}`;
  }

  return (
    <MainLayout>
      <div className="w-full px-8 py-10 text-white">
        <div className="mx-auto max-w-6xl">
          <button type="button" onClick={() => router.back()} className="mb-6 inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.035] px-3 py-2 text-sm text-white/60 transition hover:border-white/20 hover:bg-white/[0.06] hover:text-white">
            <ArrowLeft size={15} strokeWidth={1.8} />{tp("back")}
          </button>

          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.22em] text-cyan-400">{tp("sectionKnow")}</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight">{t("title")}</h1>
              <p className="mt-2 text-sm text-white/45">{t("subtitle")}</p>
            </div>
            <div>
              <input ref={fileInput} type="file" className="hidden" onChange={(event) => void handleUpload(event.target.files?.[0])} />
              <button type="button" disabled={working === "upload"} onClick={() => fileInput.current?.click()} className="inline-flex items-center gap-2 rounded-xl border border-cyan-300/20 bg-cyan-300/[0.08] px-4 py-2.5 text-sm text-cyan-50 transition hover:bg-cyan-300/[0.12] disabled:opacity-50">
                <Upload size={15} />{working === "upload" ? "Import…" : "Importer un document"}
              </button>
            </div>
          </div>

          <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
            <button type="button" onClick={() => navigateTo(-1)} className="text-cyan-300">Mon Drive</button>
            {folderTrail.map((folder, index) => <span key={folder.id} className="flex items-center gap-2"><span className="text-white/30">/</span><button type="button" onClick={() => navigateTo(index)} className="text-cyan-300">{folder.name}</button></span>)}
            <button type="button" onClick={() => void createFolder()} disabled={working === "create"} className="ml-auto flex items-center gap-2 rounded-lg border border-white/15 px-3 py-2"><FolderPlus size={15}/>Nouveau dossier</button>
          </div>
          {moveTarget && <section role="dialog" aria-label="Choisir le dossier de destination" className="mb-6 rounded-xl border border-cyan-300/25 bg-[#101827] p-5">
            <div className="flex items-center justify-between gap-4"><h2 className="font-semibold">Déplacer « {moveTarget.name} »</h2><button type="button" onClick={() => setMoveTarget(null)}>Annuler</button></div>
            <div className="mt-3 flex flex-wrap gap-2 text-sm"><button type="button" onClick={() => { setDestinationTrail([]); void browseDestination(); }} className="text-cyan-300">Mon Drive</button>
              {destinationTrail.map((folder, index) => <button type="button" key={folder.id} className="text-cyan-300" onClick={() => { const next = destinationTrail.slice(0, index + 1); setDestinationTrail(next); void browseDestination(folder.id); }}>/ {folder.name}</button>)}
            </div>
            {destinationLoading ? <p className="mt-3 text-sm text-white/60">Chargement des dossiers…</p> : <div className="mt-3 grid gap-2 sm:grid-cols-2">{destinations.map(folder => <button type="button" key={folder.id} onClick={() => { setDestinationTrail(prev => [...prev, { id: folder.id, name: folder.name }]); void browseDestination(folder.id); }} className="flex items-center gap-2 rounded-lg border border-white/10 p-3 text-left text-sm"><Folder size={16} className="text-cyan-300"/>{folder.name}</button>)}</div>}
            {destinationPageToken && <button type="button" disabled={destinationLoading} onClick={() => void browseDestination(destinationTrail.at(-1)?.id ?? "", destinationPageToken)} className="mt-3 rounded-lg border border-white/15 px-3 py-2 text-sm">Afficher davantage de dossiers</button>}
            <button type="button" disabled={!destinationTrail.length || destinationTrail.at(-1)?.id === moveTarget.parentId || working !== null} onClick={() => void confirmMove()} className="mt-4 rounded-lg bg-cyan-800 px-4 py-2 text-sm disabled:opacity-40">Confirmer le déplacement dans ce dossier</button>
          </section>}
          {selected && <section className="mb-6 rounded-xl border border-cyan-300/20 p-5"><div className="flex justify-between gap-4"><h2 className="font-semibold">{selected.name}</h2><button type="button" onClick={() => setSelected(null)}>Fermer</button></div>{selected.recommendation && <p className="mt-3 text-cyan-200">{selected.recommendation}</p>}<pre className="mt-4 max-h-80 overflow-auto whitespace-pre-wrap text-sm text-white/70">{selected.content}</pre></section>}
          <form onSubmit={handleSubmit} className="mb-6 flex max-w-2xl gap-2">
            <div className="relative flex-1">
              <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/35" />
              <input type="text" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("searchPlaceholder")} className="h-12 w-full rounded-xl border border-white/10 bg-white/[0.035] pl-11 pr-4 text-sm text-white outline-none placeholder:text-white/25 focus:border-cyan-400/30" />
            </div>
            <button type="submit" className="rounded-xl border border-white/10 bg-white/[0.05] px-5 text-sm text-white/75 transition hover:bg-white/[0.08] hover:text-white">{t("search")}</button>
          </form>

          {status && <div className="mb-6 rounded-xl border border-cyan-300/15 bg-cyan-300/[0.04] px-4 py-3 text-sm text-cyan-50/80">{status}</div>}
          {loading && <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-8 text-sm text-white/40">{t("loading")}</div>}
          {error && <div className="mb-6 rounded-2xl border border-amber-200/20 bg-amber-200/[0.04] p-5 text-sm text-amber-50/75">{error}</div>}
          {!loading && !error && files.length === 0 && <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-8 text-sm text-white/40">{t("empty")}</div>}

          {!loading && files.length > 0 && (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {files.map((file) => (
                <article key={file.id} className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#0F1522] p-5 transition hover:border-white/15 hover:bg-[#131A28]">
                  <span className="absolute inset-y-0 left-0 w-[2px] bg-cyan-400/70" />
                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5">{file.mimeType === "application/vnd.google-apps.folder" ? <Folder size={18} className="text-cyan-300" /> : <FileText size={18} strokeWidth={1.7} className="text-white/55" />}</div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-white/85">{file.name}</p>
                      {file.mimeType && <p className="mt-1 truncate text-xs text-white/30">{file.mimeType}</p>}
                    </div>
                  </div>

                  <div className="mt-5 grid gap-2">
                    {file.mimeType === "application/vnd.google-apps.folder" ? <button type="button" onClick={() => openFolder(file)} className="rounded-xl border border-cyan-300/20 px-4 py-2.5 text-left text-xs text-cyan-100">Ouvrir le dossier</button> : <>
                    <button type="button" disabled={working === `read:${file.id}`} onClick={() => void handleAnalyze(file)} className="flex items-center justify-between rounded-xl border border-cyan-300/15 bg-cyan-300/[0.04] px-4 py-2.5 text-xs text-cyan-50/75 transition hover:bg-cyan-300/[0.08] disabled:opacity-50">
                      {working === `read:${file.id}` ? "Lecture…" : "Lire avec Clara"}<Brain size={14} />
                    </button>
                    <a href={downloadHref(file)} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-xs text-white/60 transition hover:bg-white/[0.06] hover:text-white">Télécharger<Download size={14} /></a>
                    {file.url && <a href={file.url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-xs text-white/60 transition hover:bg-white/[0.06] hover:text-white">{t("open")}<ExternalLink size={14} /></a>}
                    <button type="button" onClick={() => startMove(file)} className="rounded-xl border border-white/10 px-4 py-2.5 text-left text-xs text-white/60">Déplacer vers un dossier…</button></>}
                  </div>
                </article>
              ))}
            </div>
          )}
          {nextPageToken && <button type="button" disabled={loading} onClick={() => void loadMore()} className="mt-6 rounded-xl border border-white/15 px-5 py-3 text-sm text-cyan-100 disabled:opacity-40">Afficher davantage de fichiers et dossiers</button>}
        </div>
      </div>
    </MainLayout>
  );
}
