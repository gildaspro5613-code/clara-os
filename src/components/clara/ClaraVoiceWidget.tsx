"use client";

import { useCallback, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2, Mic, MicOff, Volume2 } from "lucide-react";
import type { ClaraConversationMessage } from "@/lib/core/session";

type VoiceState = "idle" | "listening" | "processing" | "speaking" | "error";

interface ChatResponse {
  success?: boolean;
  message?: string;
  conversation?: ClaraConversationMessage[];
}

export default function ClaraVoiceWidget() {
  const t = useTranslations("voice");
  const [state, setState] = useState<VoiceState>("idle");
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  const speak = useCallback(async (text: string) => {
    const response = await fetch("/api/voice/speak", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) {
      throw new Error("Voice synthesis failed.");
    }

    const audioBlob = await response.blob();
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);

    setState("speaking");

    try {
      await new Promise<void>((resolve, reject) => {
        audio.onended = () => resolve();
        audio.onerror = () => reject(new Error("Audio playback failed."));
        void audio.play().catch(reject);
      });
    } finally {
      audio.pause();
      audio.src = "";
      URL.revokeObjectURL(audioUrl);
    }
  }, []);

  const processRecording = useCallback(async (blob: Blob) => {
    try {
      setState("processing");

      const form = new FormData();
      form.append("audio", blob, "clara-voice.webm");

      const transcriptionResponse = await fetch("/api/voice/transcribe", {
        method: "POST",
        body: form,
      });

      const transcription = (await transcriptionResponse.json()) as {
        success?: boolean;
        text?: string;
        message?: string;
      };

      if (!transcriptionResponse.ok || !transcription.success || !transcription.text) {
        throw new Error(transcription.message ?? "Voice transcription failed.");
      }

      const chatResponse = await fetch("/api/clara/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: transcription.text }),
      });

      const chat = (await chatResponse.json()) as ChatResponse;

      if (!chatResponse.ok || !chat.success || !chat.message) {
        throw new Error(chat.message ?? "Clara is unavailable.");
      }

      if (Array.isArray(chat.conversation)) {
        window.dispatchEvent(
          new CustomEvent("clara:conversation-updated", {
            detail: { conversation: chat.conversation },
          }),
        );
      }

      await speak(chat.message);
      setState("idle");
    } catch {
      setState("error");
    }
  }, [speak]);

  const startRecording = useCallback(async () => {
    if (state === "processing" || state === "speaking") return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];

      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };

      recorder.onerror = () => {
        stopStream();
        recorderRef.current = null;
        setState("error");
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(chunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });
        chunksRef.current = [];
        stopStream();
        recorderRef.current = null;

        if (audioBlob.size === 0) {
          setState("error");
          return;
        }

        void processRecording(audioBlob);
      };

      recorder.start();
      setState("listening");
    } catch {
      stopStream();
      setState("error");
    }
  }, [processRecording, state, stopStream]);

  const stopRecording = useCallback(() => {
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") recorder.stop();
  }, []);

  const isBusy = state === "processing" || state === "speaking";

  const statusLabel =
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
        {state === "listening" ? t("speakNaturally") : t("talk")}
      </p>
    </section>
  );
}
