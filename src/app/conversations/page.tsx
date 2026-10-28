import GlassPanel from "@/components/ui/GlassPanel";
import {loadNativeConversationNavigation} from "@/components/native/conversation-navigation";
import NativeConversationList from "@/components/native/NativeConversationList";
import NativeEarlierMessages from '@/components/native/NativeEarlierMessages';
import {nativeContext} from '@/lib/native/scoped-context';
import { nativePage } from "@/lib/native/page-fence";
import { getLocale, getTranslations } from "next-intl/server";
import Link from "next/link";
import MainLayout from "@/components/layout/MainLayout";
import { resolveOperationalContext } from "@/lib/core/operational-context";

export const dynamic = "force-dynamic";

export default async function ConversationsPage() {
  return nativePage(async()=>{

  const ui = await getTranslations("ui");
  const conversationNavigation=await loadNativeConversationNavigation();

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

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]"><section className="min-w-0">
            {conversationNavigation?<NativeConversationList {...conversationNavigation}/>:<p role="status" className="mb-4 text-sm text-white/65">{ui("nativeHistoryUnavailable")}</p>}
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

            <NativeEarlierMessages key={nativeContext()?.scope.sessionId} sessionId={nativeContext()?.scope.sessionId} firstMessageId={messages[0]?.id} windowSize={messages.length}/>
            {messages.length > 0 ? (
              <ol className="space-y-3">
                {messages.map((message) => (
                  <li id={`message-${message.id}`} key={message.id} className="rounded-2xl border border-white/10 bg-white/[0.035] p-5">
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-xs uppercase tracking-[0.18em] text-cyan-300/70">
                        {message.role === "clara" ? "Clara" : session.session.user.firstName ?? ui("user")}
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
          </section><aside className="space-y-4"><GlassPanel title={t("currentMission")}><p className="break-words text-white/80">{session.session.mission?.title??ui("uiGeneralConversation")}</p>{session.session.mission&&<Link className="mt-3 block text-cyan-200" href={`/missions?mission=${encodeURIComponent(session.session.mission.id)}`}>{ui("viewAllMissions")}</Link>}<p className="mt-4 text-sm text-white/60">{t("state")}: {t.has(`states.${session.session.state}`)?t(`states.${session.session.state}`):t("states.UNKNOWN")}</p></GlassPanel></aside></div>
        </div>
      </div>
    </MainLayout>
  );
  });
}
