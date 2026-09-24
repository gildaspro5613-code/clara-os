"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Cloud, Workflow, CreditCard, Building2, ExternalLink, Settings2, ShieldCheck } from "lucide-react";

type Status = { connected?: boolean; status?: string; error?: string; connectUrl?: string; scopes?: string[]; scenarioKeys?: string[] };
type Provider = "google" | "microsoft" | "make";

const providers = [
  { id: "google" as const, title: "Google Workspace", description: "Gmail, Agenda, Drive, Docs et Sheets.", endpoint: "/api/connections/google", icon: Cloud },
  { id: "microsoft" as const, title: "Microsoft 365 · Windows 365", description: "Compte professionnel Microsoft et découverte des Cloud PC Windows 365 autorisés.", endpoint: "/api/connections/microsoft", icon: Building2 },
  { id: "make" as const, title: "Make", description: "Scénarios et automatisations reliés à Clara.", endpoint: "/api/connections/make/status", icon: Workflow },
];

function label(status?: Status) {
  if (status?.connected) return "Connecté";
  if (status?.error?.includes("AUTH_REQUIRED")) return "Authentification requise";
  if (status?.status === "RECONNECT_REQUIRED") return "Reconnexion requise";
  if (status?.status === "UNAVAILABLE") return "Indisponible";
  return "Non connecté";
}

function detail(id: Provider, state?: Status) {
  if (!state) return "Clara vérifie la connexion…";
  if (state.error?.includes("AUTH_REQUIRED")) return "Connectez-vous à Clara OS avec un espace autorisé avant de relier Microsoft.";
  if (state.status === "RECONNECT_REQUIRED") return "La configuration doit être vérifiée avant une nouvelle utilisation.";
  if (id === "make" && state.connected) return `${state.scenarioKeys?.length ?? 0} scénario(s) Make disponible(s).`;
  if (state.connected) return "Connexion opérationnelle. Clara peut utiliser les capacités autorisées.";
  return "Ce service n’est pas encore relié à cet espace.";
}

export default function ConnectionsHub() {
  const [states, setStates] = useState<Partial<Record<Provider, Status>>>({});

  useEffect(() => {
    const controller = new AbortController();
    Promise.all(providers.map(async (provider) => {
      try {
        const response = await fetch(provider.endpoint, { cache: "no-store", credentials: "same-origin", signal: controller.signal });
        const data = await response.json() as Status;
        return [provider.id, data] as const;
      } catch {
        return [provider.id, { status: "UNAVAILABLE" }] as const;
      }
    })).then((entries) => { if (!controller.signal.aborted) setStates(Object.fromEntries(entries)); });
    return () => controller.abort();
  }, []);

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {providers.map(({ id, title, description, icon: Icon }) => {
        const state = states[id];
        const connectUrl = id === "microsoft" ? "/api/connections/microsoft/connect" : state?.connectUrl;
        return (
          <article key={id} className="flex min-h-[285px] flex-col rounded-2xl border border-white/10 bg-white/[0.025] p-6 transition hover:border-cyan-400/20">
            <div className="flex items-start justify-between gap-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-cyan-400/15 bg-cyan-400/[0.06]"><Icon className="text-cyan-300" size={21} strokeWidth={1.6} /></div>
              <span className={`rounded-full border px-3 py-1 text-[11px] ${state?.connected ? "border-emerald-400/20 bg-emerald-400/[0.08] text-emerald-300" : "border-white/10 text-white/45"}`}>{state ? label(state) : "Vérification…"}</span>
            </div>
            <h2 className="mt-5 text-lg font-medium text-white">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-white/45">{description}</p>
            <p className="mt-3 text-xs leading-5 text-white/35">{detail(id, state)}</p>
            <div className="mt-auto flex flex-wrap gap-2 pt-5">
              {!state?.connected && connectUrl && !state?.error?.includes("AUTH_REQUIRED") && (
                <a href={connectUrl} className="inline-flex items-center gap-2 rounded-xl border border-cyan-400/20 bg-cyan-400/[0.07] px-4 py-2.5 text-sm text-cyan-200 transition hover:bg-cyan-400/[0.12]">Connecter <ExternalLink size={14} /></a>
              )}
              {id === "google" && state?.connected && <Link href="/agenda" className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-sm text-white/65 hover:border-cyan-400/20"><ShieldCheck size={14} /> Utiliser Google</Link>}
              {id === "microsoft" && state?.connected && <span className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-sm text-white/55"><ShieldCheck size={14} /> Windows 365 autorisé</span>}
              {id === "make" && <Link href="/automatisations" className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-sm text-white/65 hover:border-cyan-400/20"><Settings2 size={14} /> {state?.connected ? "Gérer" : "Configurer"}</Link>}
            </div>
          </article>
        );
      })}
      <article className="flex min-h-[285px] flex-col rounded-2xl border border-white/10 bg-white/[0.018] p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03]"><CreditCard className="text-white/55" size={21} strokeWidth={1.6} /></div>
          <span className="rounded-full border border-white/10 px-3 py-1 text-[11px] text-white/45">Selon les produits</span>
        </div>
        <h2 className="mt-5 text-lg font-medium text-white">Stripe</h2>
        <p className="mt-2 text-sm leading-6 text-white/45">Paiements de Clara Live et des services Mélodie Digital.</p>
        <p className="mt-3 text-xs leading-5 text-white/35">Clara OS n’est pas une interface de paiement. Cette connexion reste réservée aux produits qui en ont besoin.</p>
      </article>
    </div>
  );
}
