import { getTranslations } from "next-intl/server";
import { Contact, Database, Users } from "lucide-react";

import MainLayout from "@/components/layout/MainLayout";

export default async function ContactsPage() {
  const t = await getTranslations("contacts");

  return (
    <MainLayout>
      <main className="min-h-full w-full bg-[#05070b] px-6 py-10 text-white lg:px-10">
        <div className="mx-auto max-w-7xl">
          <header className="mb-10 border-b border-white/10 pb-8">
            <span className="text-[11px] uppercase tracking-[0.28em] text-cyan-400/70">{t("section")}</span>
            <h1 className="mt-3 text-4xl font-medium tracking-tight">{t("title")}</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/50">{t("subtitle")}</p>
          </header>
          <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
            <article className="relative rounded-3xl border border-white/10 bg-white/[0.025] p-8">
              <span className="absolute inset-y-0 left-0 w-[2px] bg-cyan-400/70" />
              <Contact className="text-cyan-300" size={24} strokeWidth={1.6} />
              <h2 className="mt-6 text-xl font-medium">{t("emptyTitle")}</h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-white/50">{t("emptyDescription")}</p>
            </article>
            <aside className="rounded-3xl border border-white/10 bg-white/[0.025] p-7">
              <span className="text-[10px] uppercase tracking-[0.22em] text-cyan-400/70">{t("availability")}</span>
              <div className="mt-7 space-y-6">
                <div className="flex gap-3"><Users className="mt-0.5 text-white/35" size={17} /><p className="text-sm leading-6 text-white/60">{t("noDirectory")}</p></div>
                <div className="flex gap-3"><Database className="mt-0.5 text-white/35" size={17} /><p className="text-sm leading-6 text-white/60">{t("backendRequired")}</p></div>
              </div>
            </aside>
          </section>
        </div>
      </main>
    </MainLayout>
  );
}
