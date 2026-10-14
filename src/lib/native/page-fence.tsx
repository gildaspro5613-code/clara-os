import { getTranslations } from "next-intl/server";
import MainLayout from "@/components/layout/MainLayout";
/** No global loader is invoked; keep shell available without rendering private
 * RSC data while project-bound native navigation/runtime is not implemented. */
export async function nativePageFence() {
  const t=await getTranslations("ui");
  return <MainLayout><section className="w-full p-8" data-native-authority="locked">
    <h1 className="text-xl text-white">{t("nativeAccessLocked")}</h1>
    <p className="mt-3 max-w-2xl text-sm text-white/65">{t("nativeAccessHelp")}</p>
  </section></MainLayout>;
}
