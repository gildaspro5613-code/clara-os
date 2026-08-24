/**
 * ============================================
 * CLARA OS
 * Cockpit Module
 * --------------------------------------------
 * File : ConversationsPanel.tsx
 * Responsibility :
 * Displays Clara's latest conversations.
 *
 * Presentation only.
 * ============================================
 */

import GlassPanel from "@/components/ui/GlassPanel";

export default function ConversationsPanel() {
  return (
    <GlassPanel title="Dernières conversations">
      <div className="space-y-4">

        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">

          <div className="flex items-center justify-between">
            <p className="font-semibold">
              Festival Horizon
            </p>

            <span className="text-xs text-white/45">
              12 min
            </span>
          </div>

          <p className="mt-2 text-sm text-white/70">
            Tu as reçu les derniers documents.
          </p>

        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">

          <div className="flex items-center justify-between">
            <p className="font-semibold">
              Melodie Digital
            </p>

            <span className="text-xs text-white/45">
              28 min
            </span>
          </div>

          <p className="mt-2 text-sm text-white/70">
            Clara poursuit le développement du cockpit.
          </p>

        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">

          <div className="flex items-center justify-between">
            <p className="font-semibold">
              Google Agenda
            </p>

            <span className="text-xs text-white/45">
              1 h
            </span>
          </div>

          <p className="mt-2 text-sm text-white/70">
            Deux rendez-vous sont confirmés aujourd'hui.
          </p>

        </div>

      </div>
    </GlassPanel>
  );
}