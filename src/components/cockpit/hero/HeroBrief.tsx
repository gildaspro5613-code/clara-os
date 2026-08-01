/**
 * ============================================
 * CLARA OS
 * Cockpit Module
 * --------------------------------------------
 * File : HeroBrief.tsx
 * Responsibility :
 * Displays Clara's daily briefing.
 * ============================================
 */

export interface HeroBriefProps {
  title?: string;
  message?: string;
}

export default function HeroBrief({
  title = "Bonjour Gildas 👋",
  message = "Clara est opérationnelle. Je suis prête à vous accompagner tout au long de votre journée.",
}: HeroBriefProps) {
  return (
    <div className="space-y-4">

      <div>
        <h1 className="text-4xl font-bold tracking-tight text-white">
          {title}
        </h1>

        <p className="mt-4 max-w-2xl text-lg text-slate-300 leading-relaxed">
          {message}
        </p>
      </div>

    </div>
  );
}