"use client";

import { useTranslations } from "next-intl";
import { Loader2, Mic, MicOff, Volume2 } from "lucide-react";

import {useClaraRuntimeVoice} from "./useClaraRuntimeVoice";

export default function ClaraVoiceWidget({disabled=false}:{disabled?:boolean}) {
  const t=useTranslations("voice"),ui=useTranslations("ui");
  const {state,toggle}=useClaraRuntimeVoice(disabled);
  const startRecording=toggle,stopRecording=toggle;
  const isBusy = disabled || state === "processing" || state === "speaking";

  const statusLabel = disabled?ui("nativeProviderBlocked"):
    state === "listening"
      ? t("listening")
      : state === "processing"
        ? t("answering")
        : state === "speaking"
          ? t("speaking")
          : state === "error"
            ? t("failed")
            : t("ready");

  return (
    <section className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.035] p-5 backdrop-blur-md">
      <span aria-hidden="true" className="absolute inset-y-0 left-0 w-[2px] bg-cyan-400/70" />

      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-cyan-400">Clara Voice</p>
          <p className="mt-2 text-sm text-white/60">{statusLabel}</p>
        </div>

        <button
          type="button"
          onClick={state === "listening" ? stopRecording : startRecording}
          disabled={isBusy}
          aria-label={state === "listening" ? t("stop") : t("talk")}
          className="flex h-12 w-12 items-center justify-center rounded-full border border-cyan-400/30 bg-cyan-400/[0.08] text-cyan-300 transition hover:bg-cyan-400/[0.14] disabled:cursor-not-allowed disabled:opacity-45"
        >
          {state === "processing" ? (
            <Loader2 size={20} className="animate-spin" />
          ) : state === "speaking" ? (
            <Volume2 size={20} />
          ) : state === "listening" ? (
            <MicOff size={20} />
          ) : (
            <Mic size={20} />
          )}
        </button>
      </div>

      <p className="mt-4 text-xs leading-relaxed text-white/35">
        {disabled?ui("nativeProviderBlocked"):state === "listening" ? t("speakNaturally") : t("talk")}
      </p>
    </section>
  );
}
