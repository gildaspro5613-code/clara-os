/**
 * ============================================
 * CLARA OS
 * Cockpit Module
 * --------------------------------------------
 * File : ConversationsPanel.tsx
 * Responsibility :
 * Displays a compact overview of Clara's
 * latest conversations.
 *
 * Presentation only.
 * ============================================
 */

import GlassPanel from "@/components/ui/GlassPanel";
import { useTranslations } from "next-intl";

export default function ConversationsPanel() {
  const t = useTranslations("cockpitUi");
  return (
    <GlassPanel title={t("latestConversations")}>
      <div className="space-y-3">

        <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <p className="font-semibold">
              Festival Horizon
            </p>

            <span className="shrink-0 text-xs text-white/45">
              12 min
            </span>
          </div>

          <p className="mt-1 text-sm text-white/65">
            {t("conversationDocuments")}
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <p className="font-semibold">
              Melodie Digital
            </p>

            <span className="shrink-0 text-xs text-white/45">
              28 min
            </span>
          </div>

          <p className="mt-1 text-sm text-white/65">
            {t("conversationCockpit")}
          </p>
        </div>

      </div>
    </GlassPanel>
  );
}
