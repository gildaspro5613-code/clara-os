"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ExternalLink, FileText, Search } from "lucide-react";

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
}

export default function DocumentsPage() {
  const router = useRouter();

  const [query, setQuery] = useState("");
  const [files, setFiles] = useState<DocumentFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadDocuments(search = "") {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `/api/documents?query=${encodeURIComponent(search)}`,
        {
          cache: "no-store",
        },
      );

      const data = (await response.json()) as DocumentsResponse;

      if (!response.ok || !data.success) {
        throw new Error(
          data.message ?? "Impossible de charger les documents.",
        );
      }

      setFiles(data.files ?? []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Impossible de charger les documents.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadDocuments();
  }, []);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void loadDocuments(query.trim());
  }

  return (
    <MainLayout>
      <div className="w-full px-8 py-10 text-white">
        <div className="mx-auto max-w-6xl">
          <button
            type="button"
            onClick={() => router.back()}
            className="mb-6 inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.035] px-3 py-2 text-sm text-white/60 transition hover:border-white/20 hover:bg-white/[0.06] hover:text-white"
          >
            <ArrowLeft size={15} strokeWidth={1.8} />
            Retour
          </button>

          <div className="mb-8">
            <p className="text-[11px] uppercase tracking-[0.22em] text-cyan-400">
              Connaître
            </p>

            <h1 className="mt-2 text-3xl font-semibold tracking-tight">
              Documents
            </h1>

            <p className="mt-2 text-sm text-white/45">
              Accès aux documents de ton espace Google Drive.
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="mb-8 flex max-w-2xl gap-2"
          >
            <div className="relative flex-1">
              <Search
                size={16}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/35"
              />

              <input
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Rechercher un document..."
                className="
                  h-12
                  w-full
                  rounded-xl
                  border
                  border-white/10
                  bg-white/[0.035]
                  pl-11
                  pr-4
                  text-sm
                  text-white
                  outline-none
                  placeholder:text-white/25
                  focus:border-cyan-400/30
                "
              />
            </div>

            <button
              type="submit"
              className="
                rounded-xl
                border
                border-white/10
                bg-white/[0.05]
                px-5
                text-sm
                text-white/75
                transition
                hover:bg-white/[0.08]
                hover:text-white
              "
            >
              Rechercher
            </button>
          </form>

          {loading && (
            <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-8 text-sm text-white/40">
              Chargement des documents…
            </div>
          )}

          {error && (
            <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-8 text-sm text-white/45">
              {error}
            </div>
          )}

          {!loading && !error && files.length === 0 && (
            <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-8 text-sm text-white/40">
              Aucun document trouvé.
            </div>
          )}

          {!loading && !error && files.length > 0 && (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {files.map((file) => (
                <article
                  key={file.id}
                  className="
                    relative
                    overflow-hidden
                    rounded-2xl
                    border
                    border-white/10
                    bg-[#0F1522]
                    p-5
                    transition
                    hover:border-white/15
                    hover:bg-[#131A28]
                  "
                >
                  <span className="absolute inset-y-0 left-0 w-[2px] bg-cyan-400/70" />

                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5">
                      <FileText
                        size={18}
                        strokeWidth={1.7}
                        className="text-white/55"
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-white/85">
                        {file.name}
                      </p>

                      {file.mimeType && (
                        <p className="mt-1 truncate text-xs text-white/30">
                          {file.mimeType}
                        </p>
                      )}
                    </div>
                  </div>

                  {file.url && (
                    <a
                      href={file.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="
                        mt-5
                        flex
                        items-center
                        justify-between
                        rounded-xl
                        border
                        border-white/10
                        bg-white/[0.03]
                        px-4
                        py-2.5
                        text-xs
                        text-white/60
                        transition
                        hover:bg-white/[0.06]
                        hover:text-white
                      "
                    >
                      Ouvrir
                      <ExternalLink size={14} />
                    </a>
                  )}
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
