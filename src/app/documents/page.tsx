"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowLeft, Brain, Download, ExternalLink, FileText, Search, Upload } from "lucide-react";

import MainLayout from "@/components/layout/MainLayout";

interface DocumentFile {
  id: string;
  name: string;
  mimeType?: string;
  url?: string;
}

interface DocumentsResponse {
  success: boolean;
  files?: DocumentFile[];
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
  const [files, setFiles] = useState<DocumentFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [working, setWorking] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  async function loadDocuments(search = "") {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/documents?query=${encodeURIComponent(search)}`, { cache: "no-store" });
      const data = (await response.json()) as DocumentsResponse;
      if (!response.ok || !data.success) throw new Error(data.message ?? t("loadError"));
      setFiles(data.files ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("loadError"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadDocuments(); }, []);

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
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5"><FileText size={18} strokeWidth={1.7} className="text-white/55" /></div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-white/85">{file.name}</p>
                      {file.mimeType && <p className="mt-1 truncate text-xs text-white/30">{file.mimeType}</p>}
                    </div>
                  </div>

                  <div className="mt-5 grid gap-2">
                    <button type="button" disabled={working === `read:${file.id}`} onClick={() => void handleAnalyze(file)} className="flex items-center justify-between rounded-xl border border-cyan-300/15 bg-cyan-300/[0.04] px-4 py-2.5 text-xs text-cyan-50/75 transition hover:bg-cyan-300/[0.08] disabled:opacity-50">
                      {working === `read:${file.id}` ? "Lecture…" : "Lire avec Clara"}<Brain size={14} />
                    </button>
                    <a href={downloadHref(file)} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-xs text-white/60 transition hover:bg-white/[0.06] hover:text-white">Télécharger<Download size={14} /></a>
                    {file.url && <a href={file.url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-xs text-white/60 transition hover:bg-white/[0.06] hover:text-white">{t("open")}<ExternalLink size={14} /></a>}
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
