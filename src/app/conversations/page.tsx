import { getLocale, getTranslations } from "next-intl/server";
import Link from "next/link";
import MainLayout from "@/components/layout/MainLayout";
import { resolveOperationalContext } from "@/lib/core/operational-context";

export const dynamic = "force-dynamic";

export default async function ConversationsPage() {
  const [t, locale, session] = await Promise.all([
    getTranslations("pages"),
    getLocale(),
    resolveOperationalContext(),
  ]);
  const messages = session.session.conversation;

  return (
    <MainLayout>
      <div className="w-full px-8 py-10 text-white">
        <div className="mx-auto max-w-6xl">
          <div className="mb-8">
            <p className="text-[11px] uppercase tracking-[0.22em] text-cyan-400">
              {t("sectionOperate")}
            </p>

            <h1 className="mt-2 text-3xl font-semibold tracking-tight">
              {t("conversations")}
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/45">
              {t("conversationsSubtitle")}
            </p>
          </div>

          <div className="max-w-5xl">
            <div className="mb-5 flex items-center justify-between gap-4">
              <p className="text-sm text-white/45">
                {messages.length > 0
                  ? t("conversationHistoryCount", { count: messages.length })
                  : t("conversationHistoryEmpty")}
              </p>
              <Link href="/clara" className="rounded-xl border border-cyan-300/20 bg-cyan-300/[0.08] px-4 py-2 text-sm text-cyan-100 transition hover:bg-cyan-300/[0.12]">
                {t("continueWithClara")}
              </Link>
            </div>

            {messages.length > 0 ? (
              <ol className="space-y-3">
                {messages.map((message) => (
                  <li key={message.id} className="rounded-2xl border border-white/10 bg-white/[0.035] p-5">
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-xs uppercase tracking-[0.18em] text-cyan-300/70">
                        {message.role === "clara" ? "Clara" : session.session.user.firstName ?? "Utilisateur"}
                      </span>
                      <time dateTime={message.createdAt} className="text-xs text-white/30">
                        {new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(message.createdAt))}
                      </time>
                    </div>
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-white/75">{message.content}</p>
                  </li>
                ))}
              </ol>
            ) : (
              <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-8 text-sm text-white/45">
                {t("conversationHistoryExplanation")}
              </div>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
