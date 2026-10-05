"use client";

import { useState } from "react";
import type { CommercialCommunicationDraft } from "@/lib/acquisition/commercial-communication-draft";
import type { ClaraConversationMessage } from "@/lib/core/session";

export default function CommercialDraftEditor({
  initialDraft,
}: {
  initialDraft: CommercialCommunicationDraft;
}) {
  const [draft, setDraft] = useState(initialDraft);
  const [subject, setSubject] = useState(initialDraft.subject);
  const [body, setBody] = useState(initialDraft.body);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/clara/acquisition/commercial-draft", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ submissionId: draft.submissionId, subject, body }),
      });
      const data = await response.json() as {
        success?: boolean;
        message?: string;
        draft?: CommercialCommunicationDraft;
        conversation?: ClaraConversationMessage[];
      };
      if (!response.ok || !data.success || !data.draft) {
        throw new Error(data.message ?? "Impossible d’enregistrer le brouillon.");
      }
      setDraft(data.draft);
      setSubject(data.draft.subject);
      setBody(data.draft.body);
      setEditing(false);
      if (Array.isArray(data.conversation)) {
        window.dispatchEvent(new CustomEvent("clara:conversation-updated", {
          detail: { conversation: data.conversation },
        }));
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Impossible d’enregistrer le brouillon.");
    } finally {
      setSaving(false);
    }
  }

  const status = draft.approval.status === "approved"
    ? draft.delivery.reason === "transport-not-configured"
      ? "Validation obtenue · transport IONOS non configuré"
      : "Validé"
    : draft.approval.status === "rejected"
      ? "Refusé"
      : "Validation requise";

  return (
    <div className="rounded-xl border border-amber-200/20 bg-amber-200/[0.04] p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs uppercase tracking-wide text-amber-100/70">Communication préparée par Clara</p>
          <p className="mt-1 text-xs text-white/45">Révision {draft.revision} · aucun envoi automatique</p>
        </div>
        <span className="rounded-full border border-amber-200/20 px-3 py-1 text-xs text-amber-100/80">{status}</span>
      </div>

      <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
        <p className="text-white/60">De : <span className="text-white/85">{draft.sender.name} &lt;{draft.sender.email}&gt;</span></p>
        <p className="text-white/60">À : <span className="text-white/85">{draft.recipient.name} &lt;{draft.recipient.email}&gt;</span></p>
      </div>

      {editing ? (
        <div className="mt-4 space-y-3">
          <label className="block text-xs text-white/55">Objet
            <input value={subject} onChange={(event) => setSubject(event.target.value)} className="mt-1 w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white outline-none focus:border-cyan-300/30" />
          </label>
          <label className="block text-xs text-white/55">Message
            <textarea value={body} onChange={(event) => setBody(event.target.value)} rows={12} className="mt-1 w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm leading-relaxed text-white outline-none focus:border-cyan-300/30" />
          </label>
          {error && <p className="text-xs text-red-200">{error}</p>}
          <div className="flex gap-2">
            <button type="button" disabled={saving} onClick={() => void save()} className="rounded-lg bg-cyan-300/10 px-4 py-2 text-xs text-cyan-100 disabled:opacity-50">{saving ? "Enregistrement…" : "Enregistrer"}</button>
            <button type="button" disabled={saving} onClick={() => { setEditing(false); setSubject(draft.subject); setBody(draft.body); }} className="rounded-lg border border-white/10 px-4 py-2 text-xs text-white/65">Annuler</button>
          </div>
        </div>
      ) : (
        <>
          <p className="mt-3 text-sm text-white/60">Objet : <span className="text-white/90">{draft.subject}</span></p>
          <div className="mt-3 whitespace-pre-line rounded-lg border border-white/10 bg-black/10 p-4 text-sm leading-relaxed text-white/80">{draft.body}</div>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button type="button" onClick={() => setEditing(true)} className="rounded-lg border border-white/10 px-4 py-2 text-xs text-white/75 hover:bg-white/5">Modifier</button>
            <span className="text-xs text-white/40">Vous pouvez aussi demander à Clara de reformuler ce message, puis confirmer l’envoi dans la conversation.</span>
          </div>
        </>
      )}
    </div>
  );
}
