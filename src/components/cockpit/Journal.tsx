const activities = [
  {
    time: "09:12",
    text: "Relance Finom préparée",
  },
  {
    time: "09:26",
    text: "2 nouveaux prospects détectés",
  },
  {
    time: "09:41",
    text: "Scénario Make W02 exécuté",
  },
  {
    time: "10:03",
    text: "Agenda synchronisé",
  },
];

export default function Journal() {
  return (
    <aside className="rounded-2xl border border-white/10 bg-[#111827] p-6 h-full">

      <h2 className="text-lg font-semibold text-white">
        Journal de Clara
      </h2>

      <p className="mt-1 text-sm text-slate-400">
        Activité du jour
      </p>

      <div className="mt-6 space-y-5">
        {activities.map((activity) => (
          <div
            key={`${activity.time}-${activity.text}`}
            className="border-l-2 border-cyan-500 pl-4"
          >
            <p className="text-xs text-slate-500">
              {activity.time}
            </p>

            <p className="mt-1 text-sm text-slate-200">
              {activity.text}
            </p>
          </div>
        ))}
      </div>

    </aside>
  );
}