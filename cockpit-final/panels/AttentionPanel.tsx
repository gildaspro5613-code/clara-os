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

export default function AttentionPanel() {
  return (
    <GlassPanel title="Attention">
      <div className="space-y-5">

        <div className="flex items-start gap-3">

          <div className="mt-2 h-2.5 w-2.5 rounded-full bg-amber-400 animate-pulse" />

          <div>
            <p className="text-lg font-semibold">
              Deux éléments demandent ton attention.
            </p>

            <p className="mt-2 text-sm leading-relaxed text-white/70">
              Clara a identifié deux actions prioritaires pour bien démarrer
              ta journée.
            </p>
          </div>

        </div>

        <div className="rounded-2xl bg-white/5 border border-white/10 p-4">

          <div className="flex justify-between">

            <span className="text-sm text-white/60">
              Priorité
            </span>

            <span className="text-sm font-medium text-amber-300">
              Élevée
            </span>

          </div>

        </div>

      </div>
    </GlassPanel>
  );
}