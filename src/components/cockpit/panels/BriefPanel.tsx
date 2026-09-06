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

import GlassPanel from "@/components/ui/GlassPanel";
import { useTranslations } from "next-intl";

interface BriefPanelProps {
  firstName?: string | null;
}

function personalizeGreeting(
  greeting: string,
  firstName?: string | null,
): string {
  if (!firstName?.trim()) return greeting;

  return greeting.replace(
    /^([^.!?]+)([.!?])/, 
    `$1 ${firstName.trim()}$2`,
  );
}

/**
 * BriefPanel displays Clara's greeting copy inside
 * the shared glass surface.
 */
export default function BriefPanel({
  firstName,
}: BriefPanelProps) {
  const t = useTranslations("cockpitUi");
  return (
    <GlassPanel className="max-w-[15rem] px-6 py-5 bg-[#07111f]/55 border-white/[0.08] shadow-[0_2px_18px_rgba(0,0,0,0.18)] backdrop-blur-[18px]">
      <h2 className="mb-2 text-[1.6rem] leading-snug font-light text-white/90">
        {personalizeGreeting(t("greeting"), firstName)}
      </h2>

      <p className="mb-3 text-sm leading-normal text-white/72">
        {t("dayReady")}
      </p>

      <p className="mb-4 text-sm leading-normal text-white/58">
        {t("twoTopics")}
      </p>

      <p className="text-sm font-medium text-white/80">
        {t("startQuestion")}
      </p>
    </GlassPanel>
  );
}
