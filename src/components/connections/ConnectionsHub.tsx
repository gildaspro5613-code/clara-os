"use client";

import { useEffect, useState } from "react";
import { Cloud, Workflow, CreditCard, Building2, ExternalLink } from "lucide-react";

type Status = { connected?: boolean; status?: string; error?: string; connectUrl?: string };
type Provider = "google" | "microsoft" | "make";

const providers = [
  { id: "google" as const, title: "Google Workspace", description: "Gmail, Agenda, Drive, Docs et Sheets.", endpoint: "/api/connections/google", icon: Cloud },
  { id: "microsoft" as const, title: "Microsoft 365 · Windows 365", description: "Compte professionnel Microsoft et Windows 365.", endpoint: "/api/connections/microsoft", icon: Building2 },
  { id: "make" as const, title: "Make", description: "Scénarios et automatisations reliés à Clara.", endpoint: "/api/connections/make/status", icon: Workflow },
];

function label(status?: Status) {
  if (status?.connected) return "Connecté";
  if (status?.error?.includes("AUTH_REQUIRED")) return "Authentification requise";
  if (status?.status === "UNAVAILABLE") return "Indisponible";
  return "Non connecté";
}

export default function ConnectionsHub() {
  const [states, setStates] = useState<Partial<Record<Provider, Status>>>({});

  useEffect(() => {
    let active = true;
    Promise.all(providers.map(async (provider) => {
      try {
        const response = await fetch(provider.endpoint, { cache: "no-store", credentials: "same-origin" });
        const data = await response.json() as Status;
        return [provider.id, data] as const;
      } catch {
        return [provider.id, { status: "UNAVAILABLE" }] as const;
      }
    })).then((entries) => { if (active) setStates(Object.fromEntries(entries)); });
    return () => { active = false; };
  }, []);

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {providers.map(({ id, title, description, icon: Icon }) => {
        const state = states[id];
        const connectUrl = id === "microsoft" ? "/api/connections/microsoft/connect" : state?.connectUrl;
        return (
          <article key={id} className="rounded-2xl border border-white/10 bg-white/[0.025] p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-cyan-400/15 bg-cyan-400/[0.06]">
                <Icon className="text-cyan-300" size={21} strokeWidth={1.6} />
              </div>
              <span className={`rounded-full border px-3 py-1 text-[11px] ${state?.connected ? "border-emerald-400/20 bg-emerald-400/[0.08] text-emerald-300" : "border-white/10 text-white/45"}`}>
                {state ? label(state) : "Vérification…"}
              </span>
            </div>
            <h2 className="mt-5 text-lg font-medium text-white">{title}</h2>
            <p className="mt-2 min-h-12 text-sm leading-6 text-white/45">{description}</p>
            {!state?.connected && connectUrl && (
              <a href={connectUrl} className="mt-5 inline-flex items-center gap-2 rounded-xl border border-cyan-400/20 bg-cyan-400/[0.07] px-4 py-2.5 text-sm text-cyan-200 transition hover:bg-cyan-400/[0.12]">
                Connecter <ExternalLink size={14} />
              </a>
            )}
          </article>
        );
      })}
      <article className="rounded-2xl border border-white/10 bg-white/[0.018] p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03]">
            <CreditCard className="text-white/55" size={21} strokeWidth={1.6} />
          </div>
          <span className="rounded-full border border-white/10 px-3 py-1 text-[11px] text-white/45">Selon les produits</span>
        </div>
        <h2 className="mt-5 text-lg font-medium text-white">Stripe</h2>
        <p className="mt-2 text-sm leading-6 text-white/45">Paiements de Clara Live et des services Mélodie Digital. Aucun paiement n’est activé depuis Clara OS.</p>
      </article>
    </div>
  );
}
