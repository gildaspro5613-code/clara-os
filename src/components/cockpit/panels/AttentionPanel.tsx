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

import { getTranslations } from "next-intl/server";
import GlassPanel from "@/components/ui/GlassPanel";

export default async function AttentionPanel() {
  const t = await getTranslations("cockpit");

  return (
    <GlassPanel title={t("attention")}>
      <div className="space-y-5">

        <div className="flex items-start gap-3">

          <div className="mt-2 h-2.5 w-2.5 rounded-full bg-amber-400 animate-pulse" />

          <div>
            <p className="text-lg font-semibold">
              {t("attentionCount", { count: 2 })}
            </p>

            <p className="mt-2 text-sm leading-relaxed text-white/70">
              {t("attentionDescription")}
            </p>
          </div>

        </div>

        <div className="rounded-2xl bg-white/5 border border-white/10 p-4">

          <div className="flex justify-between">

            <span className="text-sm text-white/60">
              {t("priorityLevel")}
            </span>

            <span className="text-sm font-medium text-amber-300">
              {t("priorityHigh")}
            </span>

          </div>

        </div>

      </div>
    </GlassPanel>
  );
}