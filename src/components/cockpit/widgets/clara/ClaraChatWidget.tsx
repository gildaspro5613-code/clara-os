"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Check, RefreshCw, Send, X } from "lucide-react";

interface PendingApproval {
  id: string;
  token: string;
  capabilityId: string;
  summary: string;
  expiresAt: string;
}

interface Message {
  id: number;
  role: "user" | "clara";
  content: string;
}

interface ClaraChatWidgetProps {
  autoFocus?: boolean;
}

const GOOGLE_RETRY_STORAGE_KEY = "clara_google_retry_message";
const CHAT_HISTORY_STORAGE_KEY = "clara_chat_history";

function parseStoredHistory(value: string | null): Message[] {
  if (!value) return [];

  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter(
        (item): item is Message =>
          item !== null &&
          typeof item === "object" &&
          "id" in item &&
          typeof item.id === "number" &&
          "role" in item &&
          (item.role === "user" || item.role === "clara") &&
          "content" in item &&
          typeof item.content === "string",
      )
      .slice(-12);
  } catch {
    return [];
  }
}

export default function ClaraChatWidget({
  autoFocus = false,
}: ClaraChatWidgetProps) {
  const t = useTranslations("chat");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      role: "clara",
      content: t("greeting"),
    },
  ]);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [approvals, setApprovals] = useState<PendingApproval[]>([]);
  const [requiredConnections, setRequiredConnections] = useState<string[]>([]);
  const [retryMessage, setRetryMessage] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const storedHistory = parseStoredHistory(
      sessionStorage.getItem(CHAT_HISTORY_STORAGE_KEY),
    );

    if (storedHistory.length > 0) {
      setMessages(storedHistory);
    }

    const params = new URLSearchParams(window.location.search);
    if (params.get("google") !== "connected") return;

    const pendingMessage = sessionStorage.getItem(GOOGLE_RETRY_STORAGE_KEY);
    sessionStorage.removeItem(GOOGLE_RETRY_STORAGE_KEY);

    params.delete("google");
    const nextQuery = params.toString();
    const cleanUrl = `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ""}${window.location.hash}`;
    window.history.replaceState({}, "", cleanUrl);

    if (pendingMessage?.trim()) {
      void submitMessage(
        pendingMessage.trim(),
        false,
        storedHistory.length > 0 ? storedHistory : undefined,
      );
    }
    // OAuth retry must run once on mount after the callback.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      sessionStorage.setItem(
        CHAT_HISTORY_STORAGE_KEY,
        JSON.stringify(messages.slice(-12)),
      );
    }
  }, [messages]);

  async function submitMessage(
    message: string,
    appendUserMessage: boolean,
    historyOverride?: Message[],
  ) {
    if (!message || loading) return;

    const conversationHistory = historyOverride ?? messages;

    if (appendUserMessage) {
      setMessages((current) => [
        ...current,
        {
          id: Date.now(),
          role: "user",
          content: message,
        },
      ]);
    }

    setRequiredConnections([]);
    setRetryMessage(null);
    setLoading(true);

    try {
      const response = await fetch("/api/clara/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message,
          history: conversationHistory.slice(-10).map(({ role, content }) => ({
            role,
            content,
          })),
        }),
      });

      const data = (await response.json()) as {
        success?: boolean;
        message?: string;
        approvals?: PendingApproval[];
        requiredConnections?: string[];
      };

      const connections = data.requiredConnections ?? [];
      setRequiredConnections(connections);
      if (connections.includes("google")) {
        setRetryMessage(message);
      }

      if (!response.ok || !data.success) {
        throw new Error(data.message ?? t("unavailable"));
      }

      setMessages((current) => [
        ...current,
        {
          id: Date.now() + 1,
          role: "clara",
          content: data.message ?? "",
        },
      ]);
      setApprovals((current) => [...current, ...(data.approvals ?? [])]);

      router.refresh();
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          id: Date.now() + 1,
          role: "clara",
          content:
            error instanceof Error
              ? error.message
              : t("unavailable"),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const message = input.trim();

    if (!message || loading) {
      return;
    }

    setInput("");
    await submitMessage(message, true);
  }

  function reconnectGoogle() {
    if (retryMessage) {
      sessionStorage.setItem(GOOGLE_RETRY_STORAGE_KEY, retryMessage);
    }
    sessionStorage.setItem(
      CHAT_HISTORY_STORAGE_KEY,
      JSON.stringify(messages.slice(-12)),
    );
    window.location.assign("/api/connections/google/connect");
  }

  async function decideApproval(approval: PendingApproval, decision: "approve" | "reject") {
    if (loading) return;
    setLoading(true);
    try {
      const response = await fetch("/api/clara/approvals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: approval.id, token: approval.token, decision }),
      });
      const data = await response.json() as { success?: boolean; message?: string; content?: string };
      if (response.status !== 500) {
        setApprovals((current) => current.filter((item) => item.id !== approval.id));
      }
      if (!response.ok || !data.success) throw new Error(data.message ?? t("approvalError"));
      setMessages((current) => [...current, {
        id: Date.now(),
        role: "clara",
        content: data.content || data.message || (decision === "approve" ? t("approved") : t("rejected")),
      }]);
      router.refresh();
    } catch (error) {
      setMessages((current) => [...current, {
        id: Date.now(),
        role: "clara",
        content: error instanceof Error ? error.message : t("approvalError"),
      }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <article className="relative w-full overflow-hidden rounded-2xl border border-white/10 bg-white/[0.035] p-5 backdrop-blur-md">
      <span
        aria-hidden="true"
        className="absolute inset-y-0 left-0 w-[2px] bg-cyan-400/70"
      />

      <div className="mb-4">
        <p className="text-xs uppercase tracking-[0.22em] text-cyan-400">
          Clara
        </p>

        <h2 className="mt-2 text-lg font-semibold text-white">
          {t("title")}
        </h2>
      </div>

      <div className="max-h-[360px] space-y-3 overflow-y-auto pr-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {messages.map((message) => (
          <div
            key={message.id}
            className={
              message.role === "user"
                ? "ml-auto max-w-[80%] rounded-2xl bg-cyan-500/15 px-4 py-3 text-sm text-white"
                : "max-w-[80%] rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm leading-relaxed text-white/80"
            }
          >
            {message.content}
          </div>
        ))}

        {loading && (
          <div className="max-w-[80%] rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/45">
            {t("thinking")}
          </div>
        )}
      </div>

      {requiredConnections.includes("google") && (
        <section className="mt-4 rounded-2xl border border-cyan-400/25 bg-cyan-400/[0.06] p-4" aria-live="polite">
          <p className="text-[10px] uppercase tracking-[0.2em] text-cyan-300/80">
            Connexion Google requise
          </p>
          <p className="mt-2 text-sm text-white/70">
            Clara peut reconnecter Google ici puis reprendre automatiquement ta demande.
          </p>
          <button
            type="button"
            disabled={loading}
            onClick={reconnectGoogle}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-cyan-400 px-3 py-2 text-xs font-semibold text-[#041016] transition hover:bg-cyan-300 disabled:opacity-40"
          >
            <RefreshCw size={14} /> Reconnecter Google
          </button>
        </section>
      )}

      {approvals.length > 0 && (
        <div className="mt-4 space-y-3" aria-live="polite">
          {approvals.map((approval) => (
            <section key={approval.id} className="rounded-2xl border border-cyan-400/25 bg-cyan-400/[0.06] p-4">
              <p className="text-[10px] uppercase tracking-[0.2em] text-cyan-300/80">
                {t("approvalRequired")}
              </p>
              <p className="mt-2 text-sm text-white/80">{approval.summary}</p>
              <p className="mt-1 text-xs text-white/35">{approval.capabilityId}</p>
              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => void decideApproval(approval, "approve")}
                  className="inline-flex items-center gap-2 rounded-xl bg-cyan-400 px-3 py-2 text-xs font-semibold text-[#041016] transition hover:bg-cyan-300 disabled:opacity-40"
                >
                  <Check size={14} /> {t("approve")}
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => void decideApproval(approval, "reject")}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-xs text-white/60 transition hover:bg-white/5 disabled:opacity-40"
                >
                  <X size={14} /> {t("reject")}
                </button>
              </div>
            </section>
          ))}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="mt-4 flex items-center gap-2"
      >
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          disabled={loading}
          autoFocus={autoFocus}
          placeholder={t("placeholder")}
          className="h-11 flex-1 rounded-xl border border-white/10 bg-white/5 px-4 text-sm text-white placeholder:text-white/35 outline-none transition focus:border-cyan-400/40"
        />

        <button
          type="submit"
          disabled={loading || !input.trim()}
          aria-label={t("send")}
          className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/60 transition hover:border-white/20 hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
        >
          <Send size={16} />
        </button>
      </form>
    </article>
  );
}
