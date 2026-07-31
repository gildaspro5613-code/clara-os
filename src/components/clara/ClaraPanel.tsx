import ClaraAvatar from "./ClaraAvatar";
import ClaraStatus from "./ClaraStatus";
import ClaraRecommendation from "./ClaraRecommendation";

export default function ClaraPanel() {
  return (
    <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
      <div className="flex items-start gap-6">

        <ClaraAvatar />

        <div className="flex-1">

          <h2 className="text-2xl font-bold text-slate-800">
            Bonjour Gildas 👋
          </h2>

          <p className="text-slate-500 mt-1">
            Je suis opérationnelle.
          </p>

          <div className="mt-6">
            <ClaraStatus />
          </div>

          <div className="mt-6">
            <ClaraRecommendation />
          </div>

          <button
            className="mt-8 rounded-xl bg-slate-900 text-white px-5 py-3 hover:bg-slate-700 transition"
          >
            Discuter avec Clara
          </button>

        </div>

      </div>
    </section>
  );
}