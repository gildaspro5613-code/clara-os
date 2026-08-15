/**
 * ============================================
 * CLARA OS
 * Cockpit Module
 * --------------------------------------------
 * File : BriefPanel.tsx
 * Responsibility :
 * Presentational briefing panel displayed in the
 * cockpit hero section.
 * ============================================
 */

import { getTranslations } from "next-intl/server";
import GlassPanel from "@/components/ui/GlassPanel";

/**
 * BriefPanel displays Clara's greeting copy inside
 * the shared glass surface.
 */
export default async function BriefPanel() {
  const t = await getTranslations("clara");

  return (
    <GlassPanel className="max-w-[15rem] px-6 py-5 bg-white/[0.035] border-white/[0.08] shadow-[0_2px_18px_rgba(0,0,0,0.18)]">
      <h2 className="mb-2 text-[1.6rem] leading-snug font-light text-white/90">
        Bonjour Gildas.
      </h2>

      <p className="mb-3 text-sm leading-normal text-white/72">
        {t("briefReady")}
      </p>

      <p className="mb-4 text-sm leading-normal text-white/58">
        {t("attentionSubjects")}
      </p>

      <p className="text-sm font-medium text-white/80">
        {t("startQuestion")}
      </p>
    </GlassPanel>
  );
}
