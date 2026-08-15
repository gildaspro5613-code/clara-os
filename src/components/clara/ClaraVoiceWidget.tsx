"use client";

/**
 * ============================================
 * CLARA OS
 * Clara Module
 * --------------------------------------------
 * File : ClaraVoiceWidget.tsx
 * Responsibility :
 * Voice interaction experience with Clara.
 * Resolves the active locale and wires it to an
 * ElevenLabs Conversational AI session so Clara
 * speaks in the correct language from the first
 * utterance. All UI labels are resolved through
 * the i18n system.
 *
 * Locale flow:
 *   NEXT_LOCALE / locale active
 *         ↓
 *   ClaraVoiceWidget (useLocale)
 *         ↓
 *   /api/voice/session?locale=...
 *         ↓
 *   ElevenLabs signed URL (system prompt override)
 *         ↓
 *   ElevenLabs WebSocket session
 * ============================================
 */

import { useState, useCallback } from "react";
import { useTranslations, useLocale } from "next-intl";
import { ConversationProvider, useConversation } from "@elevenlabs/react";
import { Mic, MicOff, Loader2 } from "lucide-react";
import type { Locale } from "@/i18n/types";
import type { ElevenLabsConversationOverrides } from "@/lib/connectors/internal/elevenlabs";

export interface ClaraVoiceWidgetProps {
  /** Optional callback invoked with the active locale when a session starts. */
  onLocaleReady?: (locale: Locale) => void;
}

/**
 * Session payload returned by the voice session route.
 */
interface VoiceSessionResponse {
  signedUrl: string;
  locale: Locale;
  overrides: ElevenLabsConversationOverrides;
}

/**
 * Fetches a signed ElevenLabs WebSocket URL and supported overrides.
 */
async function fetchVoiceSession(locale: Locale): Promise<VoiceSessionResponse> {
  const response = await fetch(
    `/api/voice/session?locale=${encodeURIComponent(locale)}`,
    {
      cache: "no-store",
    },
  );

  if (!response.ok) {
    throw new Error(`Voice session request failed: ${response.status}`);
  }

  const data = (await response.json()) as Partial<VoiceSessionResponse>;

  if (!data.signedUrl || !data.locale || !data.overrides) {
    throw new Error("Voice session response is incomplete.");
  }

  if (data.locale !== locale) {
    throw new Error(
      `Voice session locale mismatch: expected ${locale}, received ${data.locale}.`,
    );
  }

  return data as VoiceSessionResponse;
}

/**
 * Inner widget body — must be used within ConversationProvider.
 */
function ClaraVoiceWidgetInner({ onLocaleReady }: ClaraVoiceWidgetProps) {
  const t = useTranslations("voice");
  const locale = useLocale() as Locale;

  const { startSession, endSession, status, isSpeaking } = useConversation();

  const [starting, setStarting] = useState(false);
  const [startFailed, setStartFailed] = useState(false);

  const isActive =
    status === "connected" || status === "connecting" || starting;

  const displayStatus = (() => {
    if (status === "error" || startFailed) return "error" as const;
    if (status === "connecting" || starting) return "processing" as const;
    if (status === "connected") return isSpeaking ? "speaking" as const : "listening" as const;
    return "idle" as const;
  })();

  const statusLabel = (() => {
    switch (displayStatus) {
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

  const handleToggle = useCallback(async () => {
    if (status === "connected" || status === "connecting") {
      endSession();
      return;
    }

    if (
      status === "error" ||
      status === "disconnected" ||
      status === "idle"
    ) {
      setStartFailed(false);
      setStarting(true);
      try {
        const session = await fetchVoiceSession(locale);
        onLocaleReady?.(session.locale);
        startSession({
          signedUrl: session.signedUrl,
          overrides: session.overrides,
          onError: () => {
            setStartFailed(true);
          },
        });
      } catch {
        setStartFailed(true);
      } finally {
        setStarting(false);
      }
    }
  }, [status, locale, onLocaleReady, startSession, endSession]);

  const isTransitioning = displayStatus === "processing";

  return (
    <section
      aria-label={t("ariaLabel")}
      className="flex flex-col items-center justify-center gap-6 rounded-2xl border border-white/10 bg-[#0B1628] p-8"
    >
      {/* Status label */}
      <div className="flex items-center gap-2">
        <span
          className={`h-2.5 w-2.5 rounded-full ${
            displayStatus === "listening" || displayStatus === "speaking"
              ? "bg-cyan-400 animate-pulse"
              : displayStatus === "processing"
                ? "bg-amber-400 animate-pulse"
                : displayStatus === "error"
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
        onClick={() => void handleToggle()}
        aria-pressed={isActive}
        aria-label={isActive ? t("stop") : t("start")}
        className={`flex h-20 w-20 items-center justify-center rounded-full border-2 transition-all duration-300 ${
          isActive
            ? "border-cyan-400 bg-cyan-500/20 text-cyan-300 shadow-[0_0_24px_4px_rgba(6,182,212,0.3)]"
            : displayStatus === "error"
              ? "border-red-500/50 bg-red-500/10 text-red-400"
              : "border-white/10 bg-white/5 text-slate-400 hover:border-cyan-500/50 hover:bg-cyan-500/10 hover:text-cyan-300"
        }`}
      >
        {isTransitioning ? (
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

/**
 * Standalone voice widget for Clara.
 * Provides an ElevenLabs ConversationProvider context and resolves
 * the active locale so Clara speaks in the correct language.
 */
export default function ClaraVoiceWidget(props: ClaraVoiceWidgetProps) {
  return (
    <ConversationProvider>
      <ClaraVoiceWidgetInner {...props} />
    </ConversationProvider>
  );
}
