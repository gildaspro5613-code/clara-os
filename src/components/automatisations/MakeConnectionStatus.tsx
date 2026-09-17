"use client";

import { useEffect, useState } from "react";
import { Workflow } from "lucide-react";

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

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/connections/make/status", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const data = (await response.json()) as MakeStatus;
        setState(data);
      })
      .catch((error: unknown) => {
        if (error instanceof Error && error.name === "AbortError") return;
        setState({ provider: "make", connected: false, status: "UNAVAILABLE" });
      });
    return () => controller.abort();
  }, []);

  const status = state?.status ?? "LOADING";
  const label = status === "LOADING" ? "Vérification…" : statusLabels[status] ?? status;

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
    </aside>
  );
}
