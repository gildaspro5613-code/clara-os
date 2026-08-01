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

export default function HeroActions() {
  return (
    <div className="flex flex-wrap gap-4">

      <button
        className="rounded-xl bg-emerald-500 px-6 py-3 font-medium text-white transition hover:bg-emerald-400"
      >
        Parler à Clara
      </button>

      <button
        className="rounded-xl border border-slate-600 px-6 py-3 font-medium text-slate-200 transition hover:border-slate-400"
      >
        Voir le journal
      </button>

      <button
        className="rounded-xl border border-slate-600 px-6 py-3 font-medium text-slate-200 transition hover:border-slate-400"
      >
        Ouvrir les missions
      </button>

    </div>
  );
}