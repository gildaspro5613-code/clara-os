/**
 * ============================================
 * CLARA OS
 * Cockpit Module
 * --------------------------------------------
 * File : ConversationsPanel.tsx
 * Responsibility :
 * Displays Clara's latest conversations,
 * matching cockpit_master.png.
 *
 * Presentation only.
 * ============================================
 */

import GlassPanel from "@/components/ui/GlassPanel";

/** ConversationsPanel — 💬 DERNIÈRES CONVERSATIONS with three rows and a link. */
export default function ConversationsPanel() {
  return (
    <GlassPanel className="p-5">
      <div className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.20em] text-white/70">
        <span>💬</span>
        <span>Dernières conversations</span>
      </div>

      <ul className="mb-4 space-y-3">
        <li className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2">
            <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/10">
              <span className="text-[9px] text-white/50">●</span>
            </div>
            <div>
              <p className="text-sm font-medium leading-tight text-white/85">
                Équipe Développement
              </p>
              <p className="text-xs leading-tight text-white/50">
                Clara OS &ndash; Architecture
              </p>
            </div>
          </div>
          <span className="shrink-0 text-xs text-white/45">10:24</span>
        </li>

        <li className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2">
            <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/10">
              <span className="text-[9px] text-white/50">●</span>
            </div>
            <div>
              <p className="text-sm font-medium leading-tight text-white/85">
                Amundi Immobilier
              </p>
              <p className="text-xs leading-tight text-white/50">
                Point sur le dossier Edissimmo
              </p>
            </div>
          </div>
          <span className="shrink-0 text-xs text-white/45">Hier</span>
        </li>

        <li className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2">
            <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/10">
              <span className="text-[9px] text-white/50">●</span>
            </div>
            <div>
              <p className="text-sm font-medium leading-tight text-white/85">
                Lead &ndash; Cabinet Avocat
              </p>
              <p className="text-xs leading-tight text-white/50">
                Qualification IA
              </p>
            </div>
          </div>
          <span className="shrink-0 text-xs text-white/45">Hier</span>
        </li>
      </ul>

      <button
        type="button"
        className="text-sm text-white/60 transition-colors hover:text-white/80"
      >
        Voir toutes les conversations &rarr;
      </button>
    </GlassPanel>
  );
}
