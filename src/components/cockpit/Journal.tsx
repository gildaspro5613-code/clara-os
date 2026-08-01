/**
 * ============================================
 * CLARA OS
 * Cockpit Module
 * --------------------------------------------
 * File : Journal.tsx
 * Responsibility :
 * Displays Clara's activity log.
 * ============================================
 */

export interface JournalEntry {
  id: string;
  message: string;
  timestamp: string;
}

export interface JournalProps {
  entries?: JournalEntry[];
}

export default function Journal({
  entries = [],
}: JournalProps) {
  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
      <h2 className="text-xl font-semibold text-white">
        Journal
      </h2>

      <div className="mt-4 space-y-4">
        {entries.length === 0 ? (
          <p className="text-slate-400">
            Aucun événement enregistré.
          </p>
        ) : (
          entries.map((entry) => (
            <div key={entry.id}>
              <div className="text-xs text-slate-500">
                {entry.timestamp}
              </div>

              <div className="text-slate-200">
                {entry.message}
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}