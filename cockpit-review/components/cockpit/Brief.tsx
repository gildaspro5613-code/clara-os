/**
 * ============================================
 * CLARA OS
 * Cockpit Module
 * --------------------------------------------
 * File : Brief.tsx
 * Responsibility :
 * Displays Clara's operational briefing.
 * ============================================
 */

export interface BriefProps {
  title?: string;
  items?: string[];
}

export default function Brief({
  title = "Brief du jour",
  items = [
    "Aucun événement critique.",
    "Clara est opérationnelle.",
    "Le Brain est prêt.",
  ],
}: BriefProps) {
  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
      <h2 className="text-xl font-semibold text-white">
        {title}
      </h2>

      <ul className="mt-4 space-y-3">
        {items.map((item) => (
          <li
            key={item}
            className="text-slate-300"
          >
            • {item}
          </li>
        ))}
      </ul>
    </section>
  );
}