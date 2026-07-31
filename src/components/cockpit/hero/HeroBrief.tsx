export default function HeroBrief() {
  return (
    <div className="space-y-6">

      <div>

        <p className="text-sm uppercase tracking-[0.25em] text-slate-400">
          Bienvenue à bord
        </p>

        <h1 className="mt-3 text-4xl font-semibold text-white">
          Le Cockpit est opérationnel.
        </h1>

      </div>

      <div className="space-y-3 text-slate-300">

        <p>
          Pendant votre absence, plusieurs actions ont été préparées.
        </p>

        <p>
          Je recommande de commencer par relancer Finom.
        </p>

      </div>

    </div>
  );
}