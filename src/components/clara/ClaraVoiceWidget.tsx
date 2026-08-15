"use client";

/**
 * ============================================
 * CLARA OS
 * Clara Module
 * --------------------------------------------
 * File : ClaraVoiceWidget.tsx
 * Responsibility :
 * Voice interaction experience with Clara.
 * Displays the voice state and passes the active
 * locale to the voice layer when available.
 * All UI labels are resolved through the i18n system.
 *
 * Note: The ElevenLabs integration is managed separately.
 * This widget exposes the locale so the voice layer can
 * consume it without modifying the validated connector.
 * ============================================
 */

import { useState, useCallback } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Mic, MicOff, Loader2 } from "lucide-react";
import type { Locale } from "@/i18n/types";

type VoiceStatus = "idle" | "listening" | "processing" | "speaking" | "error";

export interface ClaraVoiceWidgetProps {
  /** Optional callback invoked when the active locale changes externally. */
  onLocaleReady?: (locale: Locale) => void;
}

/**
 * Standalone voice widget for Clara.
 * Resolves the active locale and exposes it to the voice layer
 * via the onLocaleReady callback.
 */
export default function ClaraVoiceWidget({
  onLocaleReady,
}: ClaraVoiceWidgetProps) {
  const t = useTranslations("voice");
  const locale = useLocale() as Locale;

  const [status, setStatus] = useState<VoiceStatus>("idle");

  const statusLabel = (() => {
    switch (status) {
      case "listening":
        return t("listening");
      case "processing":
        return t("processing");
      case "speaking":
        return t("speaking");
      case "error":
        return t("error");
      default:
        return t("idle");
    }
  })();

  const isActive = status !== "idle" && status !== "error";

  const handleToggle = useCallback(() => {
    if (isActive) {
      setStatus("idle");
      return;
    }

    setStatus("listening");
    onLocaleReady?.(locale);
  }, [isActive, locale, onLocaleReady]);

  return (
    <section
      aria-label={t("ariaLabel")}
      className="flex flex-col items-center justify-center gap-6 rounded-2xl border border-white/10 bg-[#0B1628] p-8"
    >
      {/* Status label */}
      <div className="flex items-center gap-2">
        <span
          className={`h-2.5 w-2.5 rounded-full ${
            status === "listening" || status === "speaking"
              ? "bg-cyan-400 animate-pulse"
              : status === "processing"
                ? "bg-amber-400 animate-pulse"
                : status === "error"
                  ? "bg-red-500"
                  : "bg-slate-600"
          }`}
        />
        <span className="text-xs uppercase tracking-wider text-slate-400">
          {t("statusLabel")}
        </span>
        <span className="text-sm text-slate-200">{statusLabel}</span>
      </div>

      {/* Microphone button */}
      <button
        onClick={handleToggle}
        aria-pressed={isActive}
        aria-label={isActive ? t("stop") : t("start")}
        className={`flex h-20 w-20 items-center justify-center rounded-full border-2 transition-all duration-300 ${
          isActive
            ? "border-cyan-400 bg-cyan-500/20 text-cyan-300 shadow-[0_0_24px_4px_rgba(6,182,212,0.3)]"
            : status === "error"
              ? "border-red-500/50 bg-red-500/10 text-red-400"
              : "border-white/10 bg-white/5 text-slate-400 hover:border-cyan-500/50 hover:bg-cyan-500/10 hover:text-cyan-300"
        }`}
      >
        {status === "processing" ? (
          <Loader2 size={28} className="animate-spin" />
        ) : isActive ? (
          <MicOff size={28} />
        ) : (
          <Mic size={28} />
        )}
      </button>

      {/* Button label */}
      <span className="text-sm text-slate-500">
        {isActive ? t("stop") : t("start")}
      </span>

      {/* Active locale indicator */}
      <div className="rounded-md border border-white/5 bg-white/5 px-2 py-1 text-[11px] text-slate-500 uppercase tracking-wider">
        {locale}
      </div>
    </section>
  );
}
