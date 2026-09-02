/**
 * ============================================
 * CLARA OS
 * Cockpit Module
 * --------------------------------------------
 * File : AttentionPanel.tsx
 * Responsibility :
 * Displays Clara's priority alerts.
 *
 * Presentation only.
 * ============================================
 */

import GlassPanel from "@/components/ui/GlassPanel";
import { useTranslations } from "next-intl";

export default function AttentionPanel() {
  const t = useTranslations("cockpitUi");
  return (
    <GlassPanel title={t("attention")}>
      <div className="space-y-4">

        <div className="flex items-start gap-3 min-w-0">

          <div className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-amber-400 animate-pulse" />

          <div className="min-w-0">
            <p className="text-base sm:text-lg font-semibold leading-snug">
              {t("attentionCount")}
            </p>

            <p className="mt-2 text-sm leading-relaxed text-white/70">
              {t("attentionDescription")}
            </p>
          </div>

        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-3 sm:p-4">

          <div className="flex items-center justify-between gap-3 min-w-0">

            <span className="text-sm text-white/60">
              Priorité
            </span>

            <span className="shrink-0 text-sm font-medium text-amber-300">
              Élevée
            </span>

          </div>

        </div>

      </div>
    </GlassPanel>
  );
}
