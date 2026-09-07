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

interface ConversationsPanelProps {
  session: ClaraSession;
}

export default function ConversationsPanel({
  session,
}: ConversationsPanelProps) {
  const t = useTranslations("cockpitUi");
  const recentMessages = session.conversation.slice(-2).reverse();

  return (
    <GlassPanel title={t("latestConversations")}>
      <div className="space-y-3">
        {recentMessages.length > 0 ? (
          recentMessages.map((message) => (
            <div
              key={message.id}
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
            >
              <div className="flex items-center justify-between gap-4">
                <p className="font-semibold">
                  {message.role === "clara"
                    ? "Clara"
                    : session.user.firstName ?? "Utilisateur"}
                </p>

                <span className="shrink-0 text-xs text-white/45">
                  {session.mission?.title ?? "Clara OS"}
                </span>
              </div>

              <p className="mt-1 line-clamp-2 text-sm text-white/65">
                {message.content}
              </p>
            </div>
          ))
        ) : (
          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
            <p className="text-sm text-white/65">
              {session.mission?.objective ?? t("conversationCockpit")}
            </p>
          </div>
        )}
      </div>
    </GlassPanel>
  );
}
