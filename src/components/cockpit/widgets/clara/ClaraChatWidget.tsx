"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Send } from "lucide-react";

interface Message {
  id: number;
  role: "user" | "clara";
  content: string;
}

interface ClaraChatWidgetProps {
  autoFocus?: boolean;
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
  const router = useRouter();

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
        id: Date.now(),
        role: "user",
        content: message,
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
      };

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
