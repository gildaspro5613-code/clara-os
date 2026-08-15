"use client";

/**
 * ============================================
 * CLARA OS
 * Clara Module
 * --------------------------------------------
 * File : ClaraChatWidget.tsx
 * Responsibility :
 * Conversational chat experience with Clara.
 * Sends user messages to /api/clara/chat with the
 * active locale so Clara responds in the right language.
 * All UI labels are resolved through the i18n system.
 * ============================================
 */

import { useRef, useState, useCallback, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Send, Trash2, Loader2 } from "lucide-react";
import type { Locale } from "@/i18n/types";

interface ChatMessage {
  id: string;
  role: "user" | "clara";
  content: string;
}

type WidgetStatus = "ready" | "thinking" | "error";

/**
 * Standalone conversational chat widget for Clara.
 * Supports all five Clara OS locales via the active locale
 * resolved by the i18n system.
 */
export default function ClaraChatWidget() {
  const t = useTranslations("chat");
  const locale = useLocale() as Locale;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [status, setStatus] = useState<WidgetStatus>("ready");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const statusLabel = (() => {
    switch (status) {
      case "thinking":
        return t("statusThinking");
      case "error":
        return t("error");
      default:
        return t("statusConnected");
    }
  })();

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || status === "thinking") return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setStatus("thinking");

    try {
      const response = await fetch("/api/clara/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, locale }),
      });

      if (!response.ok) {
        throw new Error("network");
      }

      const data = (await response.json()) as {
        success: boolean;
        content: string;
        error?: string;
      };

      const claraMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "clara",
        content: data.success
          ? data.content
          : (data.error ?? t("error")),
      };

      setMessages((prev) => [...prev, claraMessage]);
      setStatus("ready");
    } catch {
      const errorMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "clara",
        content: t("networkError"),
      };
      setMessages((prev) => [...prev, errorMessage]);
      setStatus("error");
    }
  }, [input, locale, status, t]);

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void sendMessage();
    }
  }

  function clearHistory() {
    setMessages([]);
    setStatus("ready");
    inputRef.current?.focus();
  }

  return (
    <section
      aria-label={t("ariaLabel")}
      className="flex h-full min-h-[480px] flex-col rounded-2xl border border-white/10 bg-[#0B1628] overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 px-5 py-3">
        <div className="flex items-center gap-2">
          <span
            className={`h-2.5 w-2.5 rounded-full ${
              status === "thinking"
                ? "bg-amber-400 animate-pulse"
                : status === "error"
                  ? "bg-red-500"
                  : "bg-emerald-400"
            }`}
          />
          <span className="text-sm font-medium text-white">{t("clara")}</span>
          <span className="text-xs text-slate-400">— {statusLabel}</span>
        </div>

        {messages.length > 0 && (
          <button
            onClick={clearHistory}
            aria-label={t("clearHistory")}
            className="rounded-lg p-1.5 text-slate-500 transition hover:bg-white/10 hover:text-slate-300"
          >
            <Trash2 size={15} />
          </button>
        )}
      </div>

      {/* Message list */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex h-full items-center justify-center">
            <p className="text-center text-sm text-slate-500">
              {t("welcome")}
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col gap-1 ${
              msg.role === "user" ? "items-end" : "items-start"
            }`}
          >
            <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
              {msg.role === "user" ? t("you") : t("clara")}
            </span>
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                msg.role === "user"
                  ? "bg-cyan-600 text-white rounded-br-sm"
                  : "bg-white/5 text-slate-200 rounded-bl-sm"
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {status === "thinking" && (
          <div className="flex items-start gap-2">
            <div className="flex items-center gap-2 rounded-2xl rounded-bl-sm bg-white/5 px-4 py-2.5 text-slate-400">
              <Loader2 size={14} className="animate-spin" />
              <span className="text-sm">{t("thinking")}</span>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="border-t border-white/10 px-4 py-3">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t("placeholder")}
            rows={1}
            disabled={status === "thinking"}
            aria-label={t("placeholder")}
            className="flex-1 resize-none rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/30 disabled:opacity-50 transition"
            style={{ maxHeight: "120px", overflowY: "auto" }}
          />
          <button
            onClick={() => void sendMessage()}
            disabled={!input.trim() || status === "thinking"}
            aria-label={t("send")}
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-cyan-600 text-white transition hover:bg-cyan-500 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </section>
  );
}
