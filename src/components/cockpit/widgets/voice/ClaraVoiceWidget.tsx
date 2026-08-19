"use client";

import { useRef, useState } from "react";
import { Conversation } from "@elevenlabs/client";
import { Mic } from "lucide-react";

type VoiceState =
  | "ready"
  | "connecting"
  | "listening"
  | "speaking"
  | "error";

type ConversationSession = {
  endSession: () => Promise<void>;
};

export default function ClaraVoiceWidget() {
  const [state, setState] = useState<VoiceState>("ready");
  const conversationRef = useRef<ConversationSession | null>(null);

  const active =
    state === "connecting" ||
    state === "listening" ||
    state === "speaking";

  async function startConversation() {
    if (active) {
      return;
    }

    try {
      setState("connecting");

      await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

      const response = await fetch("/api/elevenlabs/session", {
        method: "GET",
        cache: "no-store",
      });

      const data = (await response.json()) as {
        success?: boolean;
        signedUrl?: string;
        error?: string;
      };

      if (!response.ok || !data.success || !data.signedUrl) {
        throw new Error(
          data.error ??
            "Impossible de démarrer la conversation avec Clara.",
        );
      }

      const conversation =
        await Conversation.startSession({
          signedUrl: data.signedUrl,

          onConnect: () => {
            setState("listening");
          },

          onDisconnect: () => {
            conversationRef.current = null;
            setState("ready");
          },

          onError: () => {
            conversationRef.current = null;
            setState("error");
          },

          onModeChange: ({ mode }) => {
            setState(
              mode === "speaking"
                ? "speaking"
                : "listening",
            );
          },
        });

      conversationRef.current = conversation;
    } catch (error) {
      console.error(
        "Failed to start Clara voice conversation:",
        error,
      );

      conversationRef.current = null;
      setState("error");
    }
  }

  async function stopConversation() {
    const conversation = conversationRef.current;

    if (!conversation) {
      setState("ready");
      return;
    }

    try {
      await conversation.endSession();
    } catch (error) {
      console.error(
        "Failed to stop Clara voice conversation:",
        error,
      );
    } finally {
      conversationRef.current = null;
      setState("ready");
    }
  }

  async function handleToggle() {
    if (active) {
      await stopConversation();
      return;
    }

    setState("ready");
    await startConversation();
  }

  const listening =
    state === "listening" ||
    state === "speaking" ||
    state === "connecting";

  const label =
    state === "connecting"
      ? "Connexion à Clara…"
      : state === "speaking"
        ? "Clara parle…"
        : state === "listening"
          ? "Clara écoute…"
          : state === "error"
            ? "Réessayer Clara"
            : "Parler à Clara";

  const description =
    state === "connecting"
      ? "Initialisation de la conversation."
      : state === "speaking"
        ? "Clara vous répond."
        : state === "listening"
          ? "Parlez naturellement."
          : state === "error"
            ? "La conversation n’a pas pu démarrer."
            : "Clara est prête.";

  return (
    <button
      type="button"
      onClick={handleToggle}
      aria-label={
        active
          ? "Arrêter Clara"
          : "Parler à Clara"
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
          <div className="flex items-center gap-3">
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

            <span className="text-[11px] uppercase tracking-[0.18em] text-white/45">
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
              listening
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
