import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { ArrowLeft, BadgeEuro, BriefcaseBusiness, Link2, Mail, ShieldCheck } from "lucide-react";

import MainLayout from "@/components/layout/MainLayout";
import PartnerStatusActions from "@/components/partners/PartnerStatusActions";
import { DatabasePartnerRepository } from "@/lib/partners/database-repository";
import { getPartnerPrincipal } from "@/lib/partners/server-context";
import type { Commission, Deal, Partner } from "@/lib/partners/types";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ partnerId: string }> };

function money(cents: number, currency: string, locale: string): string {
  return new Intl.NumberFormat(locale, { style: "currency", currency, maximumFractionDigits: 0 }).format(cents / 100);
}

function statusClasses(status: Partner["status"]): string {
  if (status === "active") return "border-emerald-400/20 bg-emerald-400/10 text-emerald-300";
  if (status === "paused") return "border-amber-400/20 bg-amber-400/10 text-amber-300";
  if (status === "closed") return "border-white/10 bg-white/[0.04] text-white/45";
  return "border-cyan-400/20 bg-cyan-400/10 text-cyan-300";
}

export default async function PartnerDetailPage({ params }: PageProps) {
  const { partnerId } = await params;
  const [t, locale] = await Promise.all([getTranslations("partnersPage"), getLocale()]);
  const principal = getPartnerPrincipal();
  const repository = new DatabasePartnerRepository();
  const partner = await repository.findPartner(principal.workspaceId, partnerId);
  if (!partner) notFound();

  const [referrals, deals, commissions] = await Promise.all([
    repository.listReferrals(principal.workspaceId, partner.id),
    repository.listDeals(principal.workspaceId, partner.id),
    repository.listCommissions(principal.workspaceId, partner.id),
  ]);

  const wonDeals = deals.filter((deal) => deal.status === "won");
  const currency = wonDeals[0]?.currency ?? commissions[0]?.currency ?? "EUR";
  const revenue = wonDeals.filter((deal) => deal.currency === currency).reduce((sum, deal) => sum + deal.amountCents, 0);
  const pendingCommission = commissions
    .filter((commission) => commission.currency === currency && commission.status !== "paid" && commission.status !== "cancelled")
    .reduce((sum, commission) => sum + commission.amountCents, 0);

  const cards = [
    { label: t("detail.kpis.referrals"), value: String(referrals.length), icon: Link2 },
    { label: t("detail.kpis.deals"), value: String(deals.length), icon: BriefcaseBusiness },
    { label: t("detail.kpis.revenue"), value: money(revenue, currency, locale), icon: BriefcaseBusiness },
    { label: t("detail.kpis.commission"), value: money(pendingCommission, currency, locale), icon: BadgeEuro },
  ];

  return (
    <MainLayout>
      <main className="min-h-full w-full bg-[#05070b] px-4 py-8 text-white sm:px-6 lg:px-10 lg:py-10">
        <div className="mx-auto max-w-7xl">
          <Link href="/partners" className="inline-flex items-center gap-2 text-sm text-white/45 transition hover:text-cyan-300">
            <ArrowLeft size={16} /> {t("detail.back")}
          </Link>

          <header className="mt-6 border-b border-white/10 pb-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <span className="text-[11px] uppercase tracking-[0.28em] text-cyan-400/70">{t("detail.section")}</span>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <h1 className="text-3xl font-medium tracking-tight sm:text-4xl">{partner.name}</h1>
                  <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs ${statusClasses(partner.status)}`}>{t(`statuses.${partner.status}`)}</span>
                </div>
                <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/45">
                  <span className="inline-flex items-center gap-2"><Mail size={15} />{partner.email}</span>
                  <span>{t(`types.${partner.type}`)}</span>
                  <span>{t("referralCode")}: <span className="text-cyan-300/75">{partner.referralCode}</span></span>
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-4 lg:min-w-[360px]">
                <p className="mb-3 text-[10px] uppercase tracking-[0.2em] text-white/35">{t("detail.actions.title")}</p>
                <PartnerStatusActions partnerId={partner.id} status={partner.status} />
              </div>
            </div>
          </header>

          <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {cards.map(({ label, value, icon: Icon }) => (
              <article key={label} className="rounded-2xl border border-white/10 bg-white/[0.025] p-5">
                <div className="flex items-center justify-between"><span className="text-xs text-white/45">{label}</span><Icon size={17} className="text-cyan-300/80" /></div>
                <p className="mt-4 text-2xl font-medium tracking-tight">{value}</p>
              </article>
            ))}
          </section>

          <section className="mt-6 grid gap-6 xl:grid-cols-3">
            <DataPanel title={t("detail.referrals.title")} empty={t("detail.referrals.empty")}>{referrals.map((referral) => (
              <div key={referral.id} className="border-b border-white/[0.06] py-4 last:border-0">
                <div className="flex items-center justify-between gap-4"><span className="text-sm text-white/80">{referral.email ?? referral.contactId ?? referral.id}</span><span className="text-xs text-white/35">{referral.status}</span></div>
                <p className="mt-1 text-xs text-white/30">{new Date(referral.capturedAt).toLocaleDateString(locale)}</p>
              </div>
            ))}</DataPanel>

            <DataPanel title={t("detail.deals.title")} empty={t("detail.deals.empty")}>{deals.map((deal: Deal) => (
              <div key={deal.id} className="border-b border-white/[0.06] py-4 last:border-0">
                <div className="flex items-center justify-between gap-4"><span className="text-sm text-white/80">{deal.offerId}</span><span className="text-sm tabular-nums text-white/60">{money(deal.amountCents, deal.currency, locale)}</span></div>
                <p className="mt-1 text-xs text-white/35">{deal.status}</p>
              </div>
            ))}</DataPanel>

            <DataPanel title={t("detail.commissions.title")} empty={t("detail.commissions.empty")}>{commissions.map((commission: Commission) => (
              <div key={commission.id} className="border-b border-white/[0.06] py-4 last:border-0">
                <div className="flex items-center justify-between gap-4"><span className="text-sm text-white/80">{commission.status}</span><span className="text-sm tabular-nums text-white/60">{money(commission.amountCents, commission.currency, locale)}</span></div>
                <p className="mt-1 text-xs text-white/30">{t("detail.commissions.period", { period: commission.periodIndex })}</p>
              </div>
            ))}</DataPanel>
          </section>

          <div className="mt-6 flex items-start gap-3 rounded-2xl border border-cyan-400/10 bg-cyan-400/[0.04] px-4 py-3 text-xs leading-5 text-white/50">
            <ShieldCheck className="mt-0.5 shrink-0 text-cyan-300" size={17} />
            <span>{t("governance")}</span>
          </div>
        </div>
      </main>
    </MainLayout>
  );
}

function DataPanel({ title, empty, children }: { title: string; empty: string; children: React.ReactNode }) {
  const items = Array.isArray(children) ? children : [children];
  const hasItems = items.some(Boolean);
  return (
    <article className="rounded-3xl border border-white/10 bg-white/[0.02] p-6">
      <h2 className="text-lg font-medium">{title}</h2>
      <div className="mt-4">{hasItems ? children : <p className="py-8 text-center text-sm text-white/35">{empty}</p>}</div>
    </article>
  );
}
