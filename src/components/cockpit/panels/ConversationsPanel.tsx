import NativeConversationList,{type NativeConversationListProps} from "@/components/native/NativeConversationList";
/**
 * ============================================
 * CLARA OS
 * Cockpit Module
 * --------------------------------------------
 * File : ConversationsPanel.tsx
 * Responsibility :
 * Displays a compact overview of Clara's
 * latest persisted conversation activity.
 * ============================================
 */

import GlassPanel from "@/components/ui/GlassPanel";
import type { ClaraSession } from "@/lib/core/session";
import { useTranslations } from "next-intl";
import Link from "next/link";

interface ConversationsPanelProps {
  session: ClaraSession;
  conversationNavigation?:NativeConversationListProps|null;
}

export default function ConversationsPanel({
  session,conversationNavigation,
}: ConversationsPanelProps) {
  const ui = useTranslations("ui");

  const t = useTranslations("cockpitUi");
  const recentMessages = session.conversation.slice(-2).reverse();

  return (
    <GlassPanel title={t("latestConversations")}>
      <div className="space-y-3">
        {conversationNavigation&&<NativeConversationList {...conversationNavigation}/>}
        {conversationNavigation===null&&<p role="status" className="text-sm text-white/65">{ui("nativeHistoryUnavailable")}</p>}
        {recentMessages.length > 0 ? (
          recentMessages.map((message) => (
            <Link href={`/conversations#message-${encodeURIComponent(message.id)}`}
              key={message.id}
              className="block rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
            >
              <div className="flex items-center justify-between gap-4">
                <p className="font-semibold">
                  {message.role === "clara"
                    ? "Clara"
                    : session.user.firstName ?? ui("user")}
                </p>

                <span className="shrink-0 text-xs text-white/45">
                  {session.mission?.title ?? "Clara OS"}
                </span>
              </div>

              <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed text-white/65">
                {message.content}
              </p>
            </Link>
          ))
        ) : (
          <div className="block rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
            <p className="text-sm text-white/65">
              {t("noConversationHistory")}
            </p>
          </div>
        )}
        <Link href={recentMessages.length > 0 ? "/conversations" : "/clara"} className="inline-flex text-xs text-cyan-400 transition hover:text-cyan-300">
          {recentMessages.length > 0 ? t("openConversationHistory") : t("startConversation")}
        </Link>
      </div>
    </GlassPanel>
  );
}
