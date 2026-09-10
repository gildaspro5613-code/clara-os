"use client";

import { useEffect, useMemo, useState } from "react";
import { Cable, CheckCircle2, CircleOff } from "lucide-react";

import MainLayout from "@/components/layout/MainLayout";

type Connector = {
  connectorId: string;
  enabled: boolean;
};

const CONNECTORS = [
  ["google.gmail", "Google Gmail"],
  ["google.calendar", "Google Calendar"],
  ["google.drive", "Google Drive"],
  ["google.docs", "Google Docs"],
  ["google.sheets", "Google Sheets"],
  ["microsoft.outlook", "Microsoft Outlook"],
  ["microsoft.calendar", "Microsoft Calendar"],
  ["openai.responses", "OpenAI"],
  ["elevenlabs.conversation", "ElevenLabs"],
] as const;

export default function SettingsPage() {
  const [organizationId, setOrganizationId] = useState<string>();
  const [connectors, setConnectors] = useState<Connector[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  const enabled = useMemo(
    () => new Set(connectors.filter((item) => item.enabled).map((item) => item.connectorId)),
    [connectors],
  );

  useEffect(() => {
    let cancelled = false;

    async function loadConnectors() {
      setLoading(true);
      setError(undefined);
      try {
        const response = await fetch("/api/organization/connectors", {
          credentials: "same-origin",
        });
        const data = await response.json();
        if (!response.ok || !data.success) {
          throw new Error(data.error ?? "Unable to load connectors.");
        }
        if (cancelled) return;
        setOrganizationId(typeof data.organizationId === "string" ? data.organizationId : undefined);
        setConnectors(data.connectors ?? []);
      } catch (reason) {
        if (cancelled) return;
        setError(reason instanceof Error ? reason.message : "Unable to load connectors.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadConnectors();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <MainLayout>
      <section className="w-full px-8 py-8 lg:px-12">
        <div className="mx-auto max-w-5xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-400">Configurer</p>
          <h1 className="mt-2 text-3xl font-semibold text-white">Paramètres</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
            Gérez les services disponibles pour votre organisation. Les secrets de connexion ne sont pas stockés dans cette page ni dans le registre des connecteurs.
          </p>

          <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
            <p className="text-sm font-medium text-slate-200">Organisation</p>
            <p className="mt-2 text-sm text-slate-400">
              {organizationId
                ? `Session active : ${organizationId}`
                : "L’organisation est déterminée par la session sécurisée de Clara OS."}
            </p>
          </div>

          <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
            <div className="flex items-center gap-3">
              <Cable className="text-cyan-400" size={20} />
              <div>
                <h2 className="text-lg font-semibold text-white">Connecteurs</h2>
                <p className="text-sm text-slate-400">État des connexions natives disponibles pour Clara.</p>
              </div>
            </div>

            {error && (
              <p className="mt-6 rounded-xl border border-white/10 bg-[#08111F] p-4 text-sm text-rose-300">
                {error}
              </p>
            )}

            {!error && (
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {CONNECTORS.map(([id, label]) => {
                  const active = enabled.has(id);
                  return (
                    <div key={id} className="flex items-center justify-between rounded-xl border border-white/10 bg-[#08111F] px-4 py-4">
                      <div>
                        <p className="text-sm font-medium text-white">{label}</p>
                        <p className="mt-1 text-xs text-slate-500">{id}</p>
                      </div>
                      <div className={`flex items-center gap-2 text-xs ${active ? "text-emerald-300" : "text-slate-500"}`}>
                        {active ? <CheckCircle2 size={16} /> : <CircleOff size={16} />}
                        {active ? "Actif" : "Non connecté"}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {loading && <p className="mt-4 text-xs text-slate-500">Chargement…</p>}
          </div>
        </div>
      </section>
    </MainLayout>
  );
}
