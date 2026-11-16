"use client";

import { Mic } from "lucide-react";
import { useTranslations } from "next-intl";

import {useClaraRuntimeVoice} from "@/components/clara/useClaraRuntimeVoice";
import type {NativeSelectors} from "@/lib/native/authority";

export default function ClaraVoiceWidget({disabled=true,scope}:{disabled?:boolean;scope?:NativeSelectors}) {
  const t=useTranslations("voice"),ui=useTranslations("ui");
  const voice=useClaraRuntimeVoice(disabled||!scope,scope);
  const state=voice.state==='idle'?'ready':voice.state==='processing'?'connecting':voice.state;
  const active=voice.active,handleToggle=voice.toggle;
  const blocked=disabled||!scope||!voice.authorized;
  const listening =
    state === "listening" ||
    state === "speaking" ||
    state === "connecting";

  const label =
    state === "connecting"
      ? t("connecting")
      : state === "speaking"
        ? t("speaking")
        : state === "listening"
          ? t("listening")
          : state === "error"
            ? t("retry")
            : t("talk");

  const description = blocked?(voice.unavailable?t("unavailable_"+voice.unavailable):ui("nativeProviderBlocked")):
    state === "connecting"
      ? t("initializing")
      : state === "speaking"
        ? t("answering")
        : state === "listening"
          ? t("speakNaturally")
          : state === "error"
            ? t("failed")
            : t("ready");

  return (
    <button
      type="button"
      data-native-voice={scope?"scoped":"locked"}
      onClick={handleToggle}
      disabled={blocked}
      aria-label={
        active
          ? t("stop")
          : t("talk")
      }
      className="
        group
        relative
        overflow-hidden
        w-full
        rounded-2xl
        border
        border-white/10
        bg-white/[0.035]
        px-5
        py-4
        text-left
        backdrop-blur-md
        transition-all
        duration-300
        hover:border-cyan-400/20
        hover:bg-white/[0.05]
        focus:outline-none
        focus:ring-1
        focus:ring-cyan-400/30
      "
    >
      <span
        aria-hidden="true"
        className="absolute inset-y-0 left-0 w-[2px] bg-cyan-400/70"
      />

      <div className="flex items-center gap-4">
        <div
          className={`
            flex
            h-10
            w-10
            shrink-0
            items-center
            justify-center
            rounded-full
            border
            transition-all
            duration-300
            ${
              listening
                ? "border-cyan-400/40 bg-cyan-400/10 text-cyan-300"
                : "border-white/10 bg-white/5 text-white/50 group-hover:text-white/75"
            }
          `}
        >
          <Mic size={17} strokeWidth={1.7} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <div className="flex h-5 items-center gap-[3px]">
              {[3, 7, 11, 6, 9, 4, 8, 5, 10].map(
                (height, index) => (
                  <span
                    key={index}
                    className={`
                      block
                      w-[2px]
                      rounded-full
                      transition-all
                      duration-300
                      ${
                        listening
                          ? "bg-cyan-400"
                          : "bg-white/25"
                      }
                    `}
                    style={{
                      height: `${
                        listening ? height : 4
                      }px`,
                    }}
                  />
                ),
              )}
            </div>

            <span className="min-w-0 break-words text-[11px] uppercase tracking-[0.18em] text-white/45">
              {label}
            </span>
          </div>

          <p className="mt-1 text-xs text-white/35">
            {description}
          </p>
        </div>

        <span
          className={`
            h-2
            w-2
            shrink-0
            rounded-full
            transition-all
            duration-300
            ${
              blocked?"bg-slate-500":listening
                ? "bg-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.55)]"
                : state === "error"
                  ? "bg-red-400"
                  : "bg-emerald-400"
            }
          `}
        />
      </div>
    </button>
  );
}
