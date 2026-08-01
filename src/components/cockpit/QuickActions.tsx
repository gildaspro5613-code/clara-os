/**
 * ============================================
 * CLARA OS
 * Cockpit Module
 * --------------------------------------------
 * File : QuickActions.tsx
 * Responsibility :
 * Displays Clara's quick actions.
 * ============================================
 */

export interface QuickAction {
  id: string;
  label: string;
}

export interface QuickActionsProps {
  actions?: QuickAction[];
}

export default function QuickActions({
  actions = [
    {
      id: "talk",
      label: "Parler à Clara",
    },
    {
      id: "journal",
      label: "Voir le journal",
    },
    {
      id: "tasks",
      label: "Voir les missions",
    },
  ],
}: QuickActionsProps) {
  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
      <h2 className="text-xl font-semibold text-white">
        Actions rapides
      </h2>

      <div className="mt-4 flex flex-wrap gap-3">
        {actions.map((action) => (
          <button
            key={action.id}
            className="rounded-xl bg-slate-800 px-4 py-2 text-white transition hover:bg-slate-700"
          >
            {action.label}
          </button>
        ))}
      </div>
    </section>
  );
}