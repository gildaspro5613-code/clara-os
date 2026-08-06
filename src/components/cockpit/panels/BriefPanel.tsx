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

/**
 * BriefPanel displays Clara's greeting copy inside
 * the shared glass surface.
 */
export default function BriefPanel() {
  return (
    <GlassPanel className="max-w-xs px-8 py-10">
      <p className="mb-6 text-xs font-semibold uppercase tracking-widest text-white/40">
        Clara OS
      </p>

      <h2 className="mb-3 text-2xl leading-snug font-light text-white/90">
        Bonjour Gildas.
      </h2>

      <p className="mb-6 text-base leading-relaxed text-white/70">
        J&rsquo;ai préparé votre journée.
      </p>

      <p className="mb-8 text-sm leading-relaxed text-white/55">
        Deux sujets méritent votre attention.
      </p>

      <p className="text-sm font-medium text-white/80">
        Souhaitez-vous commencer&nbsp;?
      </p>
    </GlassPanel>
  );
}
