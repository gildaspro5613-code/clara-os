import { getTranslations } from "next-intl/server";
import { Database, Users } from "lucide-react";
import MainLayout from "@/components/layout/MainLayout";
import ContactsDirectory from "@/components/contacts/ContactsDirectory";

export default async function ContactsPage() {
  const t = await getTranslations("contacts");
  const labels = {
    notConnected:t("notConnected"), connectBrevo:t("connectBrevo"), loadError:t("loadError"),
    searchPlaceholder:t("searchPlaceholder"), search:t("search"), refresh:t("refresh"),
    directory:t("directory"), contacts:t("contacts"), loading:t("loading"), empty:t("empty"),
    unnamed:t("unnamed"), lists:t("lists"),
  };
  return <MainLayout><main className="min-h-full w-full bg-[#05070b] px-6 py-10 text-white lg:px-10"><div className="mx-auto max-w-7xl">
    <header className="mb-10 border-b border-white/10 pb-8"><span className="text-[11px] uppercase tracking-[0.28em] text-cyan-400/70">{t("section")}</span><h1 className="mt-3 text-4xl font-medium tracking-tight">{t("title")}</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-white/50">{t("subtitle")}</p></header>
    <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]"><ContactsDirectory labels={labels}/><aside className="rounded-3xl border border-white/10 bg-white/[0.025] p-7"><span className="text-[10px] uppercase tracking-[0.22em] text-cyan-400/70">{t("availability")}</span><div className="mt-7 space-y-6"><div className="flex gap-3"><Users className="mt-0.5 text-cyan-300/60" size={17}/><p className="text-sm leading-6 text-white/60">{t("nativeDirectory")}</p></div><div className="flex gap-3"><Database className="mt-0.5 text-cyan-300/60" size={17}/><p className="text-sm leading-6 text-white/60">{t("nativeBackend")}</p></div></div></aside></section>
  </div></main></MainLayout>;
}
