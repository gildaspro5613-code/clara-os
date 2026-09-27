"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Check, Send, X } from "lucide-react";
import type { ClaraConversationMessage } from "@/lib/core/session";

interface PendingApproval {
  id: string;
  token: string;
  capabilityId: string;
  summary: string;
  expiresAt: string;
}

interface PhysicalActionProposalView {
  id: string;
  connector: string;
  capability: string;
  parameters: Record<string, unknown>;
  conversationId: string;
  confirmation: { required: true };
}

interface ClaraChatWidgetProps {
  autoFocus?: boolean;
  initialMessages?: ClaraConversationMessage[];
  userFirstName?: string | null;
}

interface ConversationUpdatedDetail {
  conversation?: ClaraConversationMessage[];
}

function personalizedGreeting(
  greeting: string,
  firstName?: string | null,
): string {
  if (!firstName?.trim()) return greeting;

  return greeting.replace(
    /^([^.!?]+)([.!?])/,
    `$1 ${firstName.trim()}$2`,
  );
}

export default function ClaraChatWidget({
  autoFocus = false,
  initialMessages = [],
  userFirstName,
}: ClaraChatWidgetProps) {
  const t = useTranslations("chat");
  const [messages, setMessages] = useState<ClaraConversationMessage[]>(
    initialMessages.length > 0
      ? initialMessages
      : [
          {
            id: "clara-greeting",
            role: "clara",
            content: personalizedGreeting(
              t("greeting"),
              userFirstName,
            ),
            createdAt: new Date().toISOString(),
          },
        ],
  );

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [approvals, setApprovals] = useState<PendingApproval[]>([]);
  const [physicalActions, setPhysicalActions] = useState<PhysicalActionProposalView[]>([]);
  const router = useRouter();

  useEffect(() => {
    const handleConversationUpdated = (event: Event) => {
      const detail = (event as CustomEvent<ConversationUpdatedDetail>).detail;
      if (Array.isArray(detail?.conversation)) {
        setMessages(detail.conversation);
      }
    };

    window.addEventListener(
      "clara:conversation-updated",
      handleConversationUpdated,
    );

    return () => {
      window.removeEventListener(
        "clara:conversation-updated",
        handleConversationUpdated,
      );
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const message = input.trim();

    if (!message || loading) {
      return;
    }

    setInput("");

    setMessages((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        role: "user",
        content: message,
        createdAt: new Date().toISOString(),
      },
    ]);

    setLoading(true);

    try {
      const response = await fetch("/api/clara/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message }),
      });

      const data = (await response.json()) as {
        success?: boolean;
        message?: string;
        approvals?: PendingApproval[];
        conversation?: ClaraConversationMessage[];
        physicalActions?: PhysicalActionProposalView[];
      };

      if (!response.ok || !data.success) {
        throw new Error(data.message ?? t("unavailable"));
      }

      if (Array.isArray(data.conversation)) {
        setMessages(data.conversation);
      } else {
        setMessages((current) => [
          ...current,
          {
            id: crypto.randomUUID(),
            role: "clara",
            content: data.message ?? "",
            createdAt: new Date().toISOString(),
          },
        ]);
      }

      setApprovals((current) => [...current, ...(data.approvals ?? [])]);
      setPhysicalActions(data.physicalActions ?? []);

      router.refresh();
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "clara",
          content:
            error instanceof Error
              ? error.message
              : t("unavailable"),
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function decideApproval(
    approval: PendingApproval,
    decision: "approve" | "reject",
  ) {
    if (loading) return;
    setLoading(true);
    try {
      const response = await fetch("/api/clara/approvals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: approval.id, token: approval.token, decision }),
      });
      const data = await response.json() as {
        success?: boolean;
        message?: string;
        content?: string;
      };
      if (response.status !== 500) {
        setApprovals((current) =>
          current.filter((item) => item.id !== approval.id),
        );
      }
      if (!response.ok || !data.success) {
        throw new Error(data.message ?? t("approvalError"));
      }
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "clara",
          content:
            data.content ||
            data.message ||
            (decision === "approve" ? t("approved") : t("rejected")),
          createdAt: new Date().toISOString(),
        },
      ]);
      router.refresh();
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "clara",
          content:
            error instanceof Error ? error.message : t("approvalError"),
          createdAt: new Date().toISOString(),
        },
      ]);
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

      {physicalActions.length > 0 && (
        <div className="mt-4 space-y-3" aria-live="polite">
          {physicalActions.map((action) => (
            <section key={action.id} className="rounded-2xl border border-amber-300/25 bg-amber-300/[0.06] p-4">
              <p className="text-[10px] uppercase tracking-[0.2em] text-amber-200/80">
                Action physique — confirmation explicite requise
              </p>
              <p className="mt-2 text-sm text-white/80">{action.connector} · {action.capability}</p>
              <button
                type="button"
                disabled={loading}
                onClick={async () => {
                  setLoading(true);
                  try {
                    const response = await fetch("/api/clara/physical-actions/approve", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ proposalId: action.id, conversationId: action.conversationId }),
                    });
                    const data = await response.json() as {
                      success?: boolean;
                      execution?: {
                        state?: "AUTHORIZED_NOT_EXECUTED" | "QUEUED" | "FAILED";
                        commandSent?: boolean;
                        physicalExecutionConfirmed?: boolean;
                      };
                    };
                    if (!response.ok || !data.success) throw new Error("Physical action approval denied.");
                    setPhysicalActions((current) => current.filter((item) => item.id !== action.id));
                    const execution = data.execution;
                    const content =
                      execution?.state === "QUEUED"
                        ? "Action autorisée et transmise au Connector Runtime. La commande a été mise en file d’attente, mais aucun effet physique n’est confirmé."
                        : execution?.state === "FAILED"
                          ? "Action autorisée, mais la transmission au Connector Runtime a échoué. Aucun effet physique n’est confirmé."
                          : "Action autorisée. L’exécution physique est actuellement désactivée : aucune commande n’a été envoyée.";
                    setMessages((current) => [
                      ...current,
                      {
                        id: crypto.randomUUID(),
                        role: "clara",
                        content,
                        createdAt: new Date().toISOString(),
                      },
                    ]);
                  } finally {
                    setLoading(false);
                  }
                }}
                className="mt-4 inline-flex items-center gap-2 rounded-xl border border-amber-200/30 px-3 py-2 text-xs text-amber-100 disabled:opacity-40"
              >
                <Check size={14} /> Confirmer cette action physique
              </button>
            </section>
          ))}
        </div>
      )}

      {approvals.length > 0 && (
        <div className="mt-4 space-y-3" aria-live="polite">
          {approvals.map((approval) => (
            <section
              key={approval.id}
              className="rounded-2xl border border-cyan-400/25 bg-cyan-400/[0.06] p-4"
            >
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
