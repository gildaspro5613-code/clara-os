"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { CheckCircle2, Loader2, Settings2, Workflow } from "lucide-react";

type MakeStatus = {
  provider: "make";
  connected: boolean;
  status: string;
  updatedAt?: string;
};

const statusLabels: Record<string, string> = {
  ACTIVE: "Connecté",
  CONFIGURED: "Configuré",
  PENDING_AUTHENTICATION: "Configuration en attente",
  RECONNECT_REQUIRED: "Reconnexion requise",
  DISABLED: "Désactivé",
  NOT_CONFIGURED: "Non connecté",
  UNAVAILABLE: "État indisponible",
};

function badgeClass(status: string) {
  if (status === "ACTIVE") return "border-emerald-400/20 bg-emerald-400/5 text-emerald-300/80";
  if (status === "CONFIGURED" || status === "PENDING_AUTHENTICATION") return "border-cyan-400/20 bg-cyan-400/5 text-cyan-300/80";
  if (status === "RECONNECT_REQUIRED") return "border-amber-400/20 bg-amber-400/5 text-amber-300/80";
  return "border-white/10 bg-white/[0.03] text-white/45";
}

export default function MakeConnectionStatus() {
  const [state, setState] = useState<MakeStatus | null>(null);
  const [scenarioKey, setScenarioKey] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [showConfiguration, setShowConfiguration] = useState(false);
  const [busy, setBusy] = useState<"configure" | "verify" | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const refreshStatus = useCallback(async (signal?: AbortSignal) => {
    const response = await fetch("/api/connections/make/status", { cache: "no-store", signal });
    const data = (await response.json()) as MakeStatus;
    setState(data);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    refreshStatus(controller.signal).catch((error: unknown) => {
      if (error instanceof Error && error.name === "AbortError") return;
      setState({ provider: "make", connected: false, status: "UNAVAILABLE" });
    });
    return () => controller.abort();
  }, [refreshStatus]);

  async function configure(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy("configure");
    setFeedback(null);
    try {
      const response = await fetch("/api/connections/make/configure", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ scenarioKey, webhookUrl }),
      });
      if (!response.ok) throw new Error("CONFIGURATION_FAILED");
      setWebhookUrl("");
      setShowConfiguration(false);
      setFeedback("Configuration enregistrée. Vérifiez maintenant la connexion.");
      await refreshStatus();
    } catch {
      setFeedback("La configuration Make n’a pas pu être enregistrée.");
    } finally {
      setBusy(null);
    }
  }

  async function verify() {
    if (!scenarioKey.trim()) {
      setFeedback("Indiquez la clé du scénario à vérifier.");
      setShowConfiguration(true);
      return;
    }
    setBusy("verify");
    setFeedback(null);
    try {
      const response = await fetch("/api/connections/make/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ scenarioKey }),
      });
      if (!response.ok) throw new Error("VERIFICATION_FAILED");
      setFeedback("Connexion Make vérifiée et active.");
      await refreshStatus();
    } catch {
      setFeedback("La vérification Make a échoué. Contrôlez le scénario et son webhook.");
      await refreshStatus().catch(() => undefined);
    } finally {
      setBusy(null);
    }
  }

  const status = state?.status ?? "LOADING";
  const label = status === "LOADING" ? "Vérification…" : statusLabels[status] ?? status;
  const canVerify = status === "CONFIGURED" || status === "RECONNECT_REQUIRED" || status === "ACTIVE";

  return (
    <aside className="rounded-3xl border border-white/10 bg-white/[0.025] p-7 transition hover:border-cyan-400/20 hover:bg-white/[0.04]">
      <Workflow className={state?.connected ? "text-cyan-300" : "text-white/40"} size={22} />
      <h2 className="mt-5 text-lg font-medium">Make</h2>
      <p className="mt-3 text-sm leading-7 text-white/50">
        Exécute les automatisations externes autorisées par Clara OS, sans exposer les identifiants ni les webhooks au navigateur.
      </p>
      <span className={`mt-6 inline-flex rounded-full border px-3 py-1 text-[10px] uppercase tracking-[0.18em] ${badgeClass(status)}`}>
        {label}
      </span>

      <div className="mt-6 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setShowConfiguration((value) => !value)}
          className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-white/70 transition hover:border-cyan-400/25 hover:bg-white/[0.06]"
        >
          <Settings2 size={14} /> {status === "NOT_CONFIGURED" ? "Configurer" : "Modifier"}
        </button>
        {canVerify && (
          <button
            type="button"
            onClick={verify}
            disabled={busy !== null}
            className="inline-flex items-center gap-2 rounded-xl border border-cyan-400/20 bg-cyan-400/5 px-3 py-2 text-xs text-cyan-200/80 transition hover:bg-cyan-400/10 disabled:opacity-50"
          >
            {busy === "verify" ? <Loader2 className="animate-spin" size={14} /> : <CheckCircle2 size={14} />}
            Vérifier
          </button>
        )}
      </div>

      {showConfiguration && (
        <form onSubmit={configure} className="mt-5 space-y-3 border-t border-white/10 pt-5">
          <label className="block text-[11px] uppercase tracking-[0.16em] text-white/45">
            Clé du scénario
            <input
              value={scenarioKey}
              onChange={(event) => setScenarioKey(event.target.value)}
              placeholder="notify-team"
              required
              className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-sm normal-case tracking-normal text-white outline-none placeholder:text-white/25 focus:border-cyan-400/30"
            />
          </label>
          <label className="block text-[11px] uppercase tracking-[0.16em] text-white/45">
            Webhook HTTPS Make
            <input
              type="url"
              value={webhookUrl}
              onChange={(event) => setWebhookUrl(event.target.value)}
              placeholder="https://hook.eu2.make.com/…"
              required
              className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-sm normal-case tracking-normal text-white outline-none placeholder:text-white/25 focus:border-cyan-400/30"
            />
          </label>
          <button
            type="submit"
            disabled={busy !== null}
            className="inline-flex items-center gap-2 rounded-xl bg-cyan-300 px-3 py-2 text-xs font-medium text-slate-950 transition hover:bg-cyan-200 disabled:opacity-50"
          >
            {busy === "configure" && <Loader2 className="animate-spin" size={14} />}
            Enregistrer
          </button>
        </form>
      )}

      {feedback && <p className="mt-4 text-xs leading-5 text-white/50">{feedback}</p>}
    </aside>
  );
}
