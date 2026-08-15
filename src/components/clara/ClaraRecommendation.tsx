import { getTranslations } from "next-intl/server";

export default async function ClaraRecommendation() {
  const t = await getTranslations("clara");

  return (
    <div className="rounded-xl bg-blue-50 border border-blue-200 p-4">

      <p className="text-sm text-slate-500">
        {t("myRecommendation")}
      </p>

      <p className="font-semibold text-slate-800 mt-2">
        Relancer Finom aujourd'hui.
      </p>

    </div>
  );
}