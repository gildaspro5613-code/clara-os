"use client";

import {nativeGoogleHubState,type NativeGoogleHubState} from "./google-native-status";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Cloud, Workflow, CreditCard, Building2, ExternalLink, Settings2, ShieldCheck } from "lucide-react";

type Status = { nativeGoogle?: NativeGoogleHubState; connected?: boolean; status?: string; error?: string; connectUrl?: string; scopes?: string[]; scenarioKeys?: string[] };
type Provider = "google" | "microsoft" | "make";

const providers = [
  { id: "google" as const, title: "Google Workspace", endpoint: "/api/connections/google", icon: Cloud },
  { id: "microsoft" as const, title: "Microsoft 365 · Windows 365", endpoint: "/api/connections/microsoft", icon: Building2 },
  { id: "make" as const, title: "Make", endpoint: "/api/connections/make/status", icon: Workflow },
];

function label(ui: ReturnType<typeof useTranslations>, status?: Status) {
  if (status?.nativeGoogle) return ui(`googleHub_${status.nativeGoogle}`);
  if (status?.connected) return ui("connected");
  if (status?.error?.includes("AUTH_REQUIRED")) return ui("authRequired");
  if (status?.status === "RECONNECT_REQUIRED") return ui("reconnectRequired");
  if (status?.status === "UNAVAILABLE" || status?.connected===undefined) return ui("unavailable");
  return ui("notConnected");
}
function detail(ui: ReturnType<typeof useTranslations>, id: Provider, state?: Status) {
  if (!state) return ui("checkingConnection");
  if (id === "google" && state.nativeGoogle) return ui(`googleHub_${state.nativeGoogle}_help`);
  if (state.error?.includes("AUTH_REQUIRED")) return ui("signInWorkspace");
  if (state.status === "RECONNECT_REQUIRED") return ui("checkConfiguration");
  if (state.status === "UNAVAILABLE" || state.connected===undefined) return ui("unavailable");
  if (id === "make" && state.connected) return ui("makeScenarioCount",{count:state.scenarioKeys?.length??0});
  return ui(state.connected ? "connectionOperational" : "serviceNotLinked");
}

export default function ConnectionsHub() {
  const ui = useTranslations("ui");

  const [states, setStates] = useState<Partial<Record<Provider, Status>>>({});
  const searchParams = useSearchParams();
  const googleResult = searchParams.get("google");
  const microsoftResult = searchParams.get("microsoft");
  const oauthResult = googleResult ? { provider: "Google Workspace", status: googleResult } : microsoftResult ? { provider: "Microsoft", status: microsoftResult } : null;
  const oauthSuccess = oauthResult?.status === "connected";
  const googleReturnReceived = Boolean(googleResult) && oauthSuccess;

  useEffect(() => {
    const controller = new AbortController();
    Promise.all(providers.map(async (provider) => {
      try {
        const response = await fetch(provider.endpoint, { cache: "no-store", credentials: "same-origin", signal: controller.signal });
        const data = await response.json() as Status;
        if (provider.id === "google") return [provider.id,{nativeGoogle:nativeGoogleHubState(data,response.status)}] as const;
        return [provider.id, !response.ok && !data.status && !data.error?.includes("AUTH_REQUIRED") ? {...data,status:"UNAVAILABLE"} : data] as const;
      } catch {
        return [provider.id, provider.id === "google" ? {nativeGoogle:"unavailable" as const} : { status: "UNAVAILABLE" }] as const;
      }
    })).then((entries) => { if (!controller.signal.aborted) setStates(Object.fromEntries(entries)); });
    return () => controller.abort();
  }, []);

  return (
    <>
      {oauthResult && (
        <div className={`mb-5 rounded-2xl border px-5 py-4 text-sm ${oauthSuccess && !googleReturnReceived ? "border-emerald-400/20 bg-emerald-400/[0.06] text-emerald-200" : "border-amber-400/20 bg-amber-400/[0.06] text-amber-100"}`} role="status">
          {googleReturnReceived ? ui("googleHub_returnReceived") : oauthSuccess ? ui("oauthConnected",{provider:oauthResult.provider}) : oauthResult.status === "auth_required" ? ui("signInToClaraOSAgainBeforeConnectingMicrosoft") : oauthResult.status === "access_denied" ? ui("oauthCancelled",{provider:oauthResult.provider}) : ui("oauthFailed",{provider:oauthResult.provider})}
        </div>
      )}
      <div className="grid gap-4 md:grid-cols-2">
      {providers.map(({ id, title, icon: Icon }) => {
        const state = states[id];
        const connectUrl = id === "microsoft" ? "/api/connections/microsoft/connect" : state?.connectUrl;
        return (
          <article key={id} className="flex min-h-[285px] flex-col rounded-2xl border border-white/10 bg-white/[0.025] p-6 transition hover:border-cyan-400/20">
            <div className="flex items-start justify-between gap-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-cyan-400/15 bg-cyan-400/[0.06]"><Icon className="text-cyan-300" size={21} strokeWidth={1.6} /></div>
              <span className={`rounded-full border px-3 py-1 text-[11px] ${state?.connected ? "border-emerald-400/20 bg-emerald-400/[0.08] text-emerald-300" : "border-white/10 text-white/45"}`}>{state ? label(ui,state) : ui("checkingConnection")}</span>
            </div>
            <h2 className="mt-5 text-lg font-medium text-white">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-white/45">{ui(`${id}Description`)}</p>
            <p className="mt-3 text-xs leading-5 text-white/35">{detail(ui,id, state)}</p>
            <div className="mt-auto flex flex-wrap gap-2 pt-5">
              {!state?.connected && connectUrl && !state?.error?.includes("AUTH_REQUIRED") && (
                <a href={connectUrl} className="inline-flex items-center gap-2 rounded-xl border border-cyan-400/20 bg-cyan-400/[0.07] px-4 py-2.5 text-sm text-cyan-200 transition hover:bg-cyan-400/[0.12]">{ui("connect")}{" "}<ExternalLink size={14} /></a>
              )}
              {id === "google" && <Link href="/documents" className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-sm text-white/65 hover:border-cyan-400/20"><ShieldCheck size={14} />{" "}{ui("googleHub_documents")}</Link>}
              {id === "microsoft" && state?.connected && <span className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-sm text-white/55"><ShieldCheck size={14} />{" "}{ui("windows365Authorized")}</span>}
              {id === "make" && <Link href="/automatisations" className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-sm text-white/65 hover:border-cyan-400/20"><Settings2 size={14} /> {state?.connected ? ui("manage") : ui("configure")}</Link>}
            </div>
          </article>
        );
      })}
      <article className="flex min-h-[285px] flex-col rounded-2xl border border-white/10 bg-white/[0.018] p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03]"><CreditCard className="text-white/55" size={21} strokeWidth={1.6} /></div>
          <span className="rounded-full border border-white/10 px-3 py-1 text-[11px] text-white/45">{ui("dependingOnTheProduct")}</span>
        </div>
        <h2 className="mt-5 text-lg font-medium text-white">Stripe</h2>
        <p className="mt-2 text-sm leading-6 text-white/45">{ui("paymentsForClaraLiveAndMLodieDigitalServices")}</p>
        <p className="mt-3 text-xs leading-5 text-white/35">{ui("claraOSIsNotAPaymentInterfaceThisConnection")}</p>
      </article>
      </div>
    </>
  );
}
