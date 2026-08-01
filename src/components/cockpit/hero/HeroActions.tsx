/**
 * ============================================
 * CLARA OS
 * Cockpit Module
 * --------------------------------------------
 * File : HeroActions.tsx
 * Responsibility :
 * Displays Clara's primary actions.
 * ============================================
 */

import { createSession } from "@/lib/core";
import { getActions } from "@/lib/clara";

export default function HeroActions() {

  const session = createSession();

  const actions = session.recommendation
    ? getActions(session.recommendation)
    : [
        "Parler à Clara",
        "Voir le journal",
        "Ouvrir les missions",
      ];

  return (
    <div className="flex flex-wrap gap-4">

      {actions.map((action) => (
        <button
          key={action}
          className="rounded-xl border border-slate-600 px-6 py-3 font-medium text-slate-200 transition hover:border-slate-400"
        >
          {action}
        </button>
      ))}

    </div>
  );
}