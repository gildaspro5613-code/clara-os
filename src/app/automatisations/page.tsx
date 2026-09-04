import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { CalendarDays, FileText, Mail, Megaphone, Workflow } from "lucide-react";

import MainLayout from "@/components/layout/MainLayout";

const capabilities = [
  { key: "calendar", icon: CalendarDays, href: "/agenda" },
  { key: "documents", icon: FileText, href: "/documents" },
  { key: "email", icon: Mail, href: "/clara?intent=email" },
] as const;

export default async function AutomatisationsPage() {
  const t = await getTranslations("automations");
  const brevo = await getTranslations("automationsBrevo");

  return (
    <MainLayout>
      <main className="min-h-full w-full bg-[#05070b] px-6 py-10 text-white lg:px-10">
        <div className="mx-auto max-w-7xl">
          <header className="mb-10 border-b border-white/10 pb-8">
            <span className="text-[11px] uppercase tracking-[0.28em] text-cyan-400/70">{t("section")}</span>
            <h1 className="mt-3 text-4xl font-medium tracking-tight">{t("title")}</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/50">{t("subtitle")}</p>
          </header>
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
            <section>
              <h2 className="mb-5 text-[11px] uppercase tracking-[0.25em] text-white/45">{t("availableTitle")}</h2>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {capabilities.map(({ key, icon: Icon, href }) => (
                  <Link
                    key={key}
                    href={href}
                    className="block rounded-2xl border border-white/10 bg-white/[0.025] p-6 transition hover:border-cyan-400/25 hover:bg-white/[0.045] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/40"
                  >
                    <Icon className="text-cyan-300" size={21} strokeWidth={1.6} />
                    <h3 className="mt-5 font-medium">{t(`capabilities.${key}.title`)}</h3>
                    <p className="mt-2 text-sm leading-6 text-white/45">{t(`capabilities.${key}.description`)}</p>
                  </Link>
                ))}
                <Link
                  href="/clara?intent=brevo"
                  className="block rounded-2xl border border-white/10 bg-white/[0.025] p-6 transition hover:border-cyan-400/25 hover:bg-white/[0.045] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/40"
                >
                  <Megaphone className="text-cyan-300" size={21} strokeWidth={1.6} />
                  <h3 className="mt-5 font-medium">{brevo("title")}</h3>
                  <p className="mt-2 text-sm leading-6 text-white/45">{brevo("description")}</p>
                </Link>
              </div>
            </section>
            <aside className="rounded-3xl border border-white/10 bg-white/[0.025] p-7">
              <Workflow className="text-white/40" size={22} />
              <h2 className="mt-5 text-lg font-medium">{t("connectorTitle")}</h2>
              <p className="mt-3 text-sm leading-7 text-white/50">{t("connectorDescription")}</p>
              <span className="mt-6 inline-flex rounded-full border border-amber-400/20 bg-amber-400/5 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-amber-300/80">{t("notConnected")}</span>
            </aside>
          </div>
        </div>
      </main>
    </MainLayout>
  );
}
