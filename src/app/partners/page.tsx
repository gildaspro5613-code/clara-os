import { getLocale, getTranslations } from "next-intl/server";
import { BadgeEuro, Handshake, Link2, ShieldCheck, TrendingUp } from "lucide-react";

import MainLayout from "@/components/layout/MainLayout";
import { DatabasePartnerRepository } from "@/lib/partners/database-repository";
import { getPartnerPrincipal } from "@/lib/partners/server-context";
import type { Commission, Deal, Partner, Referral } from "@/lib/partners/types";

export const dynamic = "force-dynamic";

function money(cents: number, currency: string, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function statusClasses(status: Partner["status"]): string {
  if (status === "active") return "border-emerald-400/20 bg-emerald-400/10 text-emerald-300";
  if (status === "paused") return "border-amber-400/20 bg-amber-400/10 text-amber-300";
  if (status === "closed") return "border-white/10 bg-white/[0.04] text-white/45";
  return "border-cyan-400/20 bg-cyan-400/10 text-cyan-300";
}

export default async function PartnersPage() {
  const [t, locale] = await Promise.all([
    getTranslations("partnersPage"),
    getLocale(),
  ]);
  const principal = getPartnerPrincipal();
  const repository = new DatabasePartnerRepository();

  const [partners, referrals, deals, commissions] = await Promise.all([
    repository.listPartners(principal.workspaceId),
    repository.listReferrals(principal.workspaceId),
    repository.listDeals(principal.workspaceId),
    repository.listCommissions(principal.workspaceId),
  ]);

  const activePartners = partners.filter((partner) => partner.status === "active").length;
  const wonDeals = deals.filter((deal) => deal.status === "won");
  const primaryCurrency = wonDeals[0]?.currency ?? commissions[0]?.currency ?? "EUR";
  const wonRevenue = wonDeals
    .filter((deal) => deal.currency === primaryCurrency)
    .reduce((sum, deal) => sum + deal.amountCents, 0);
  const pendingCommissions = commissions
    .filter((commission) => commission.currency === primaryCurrency && commission.status !== "paid" && commission.status !== "cancelled")
    .reduce((sum, commission) => sum + commission.amountCents, 0);

  const referralsByPartner = new Map<string, Referral[]>();
  const dealsByPartner = new Map<string, Deal[]>();
  const commissionsByPartner = new Map<string, Commission[]>();
  for (const referral of referrals) referralsByPartner.set(referral.partnerId, [...(referralsByPartner.get(referral.partnerId) ?? []), referral]);
  for (const deal of deals) if (deal.partnerId) dealsByPartner.set(deal.partnerId, [...(dealsByPartner.get(deal.partnerId) ?? []), deal]);
  for (const commission of commissions) commissionsByPartner.set(commission.partnerId, [...(commissionsByPartner.get(commission.partnerId) ?? []), commission]);

  const kpis = [
    { label: t("kpis.active"), value: String(activePartners), icon: Handshake },
    { label: t("kpis.referrals"), value: String(referrals.length), icon: Link2 },
    { label: t("kpis.wonRevenue"), value: money(wonRevenue, primaryCurrency, locale), icon: TrendingUp },
    { label: t("kpis.pendingCommissions"), value: money(pendingCommissions, primaryCurrency, locale), icon: BadgeEuro },
  ];

  return (
    <MainLayout>
      <main className="min-h-full w-full bg-[#05070b] px-4 py-8 text-white sm:px-6 lg:px-10 lg:py-10">
        <div className="mx-auto max-w-7xl">
          <header className="mb-8 border-b border-white/10 pb-8">
            <span className="text-[11px] uppercase tracking-[0.28em] text-cyan-400/70">{t("section")}</span>
            <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h1 className="text-3xl font-medium tracking-tight sm:text-4xl">{t("title")}</h1>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-white/50">{t("subtitle")}</p>
              </div>
              <div className="flex max-w-md items-start gap-3 rounded-2xl border border-cyan-400/10 bg-cyan-400/[0.04] px-4 py-3 text-xs leading-5 text-white/50">
                <ShieldCheck className="mt-0.5 shrink-0 text-cyan-300" size={17} />
                <span>{t("governance")}</span>
              </div>
            </div>
          </header>

          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {kpis.map(({ label, value, icon: Icon }) => (
              <article key={label} className="rounded-2xl border border-white/10 bg-white/[0.025] p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-white/45">{label}</span>
                  <Icon size={17} className="text-cyan-300/80" />
                </div>
                <p className="mt-4 text-2xl font-medium tracking-tight text-white">{value}</p>
              </article>
            ))}
          </section>

          <section className="mt-6 overflow-hidden rounded-3xl border border-white/10 bg-white/[0.02]">
            <div className="border-b border-white/10 px-5 py-5 sm:px-7">
              <h2 className="text-lg font-medium">{t("table.title")}</h2>
            </div>

            {partners.length === 0 ? (
              <div className="px-6 py-16 text-center text-sm text-white/40">{t("table.empty")}</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-left text-sm">
                  <thead className="border-b border-white/10 text-[10px] uppercase tracking-[0.18em] text-white/35">
                    <tr>
                      <th className="px-6 py-4 font-medium">{t("table.partner")}</th>
                      <th className="px-4 py-4 font-medium">{t("table.type")}</th>
                      <th className="px-4 py-4 font-medium">{t("table.status")}</th>
                      <th className="px-4 py-4 text-right font-medium">{t("table.referrals")}</th>
                      <th className="px-4 py-4 text-right font-medium">{t("table.revenue")}</th>
                      <th className="px-6 py-4 text-right font-medium">{t("table.commission")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.06]">
                    {partners.map((partner) => {
                      const partnerDeals = dealsByPartner.get(partner.id) ?? [];
                      const partnerCommissions = commissionsByPartner.get(partner.id) ?? [];
                      const partnerCurrency = partnerDeals.find((deal) => deal.status === "won")?.currency ?? partnerCommissions[0]?.currency ?? primaryCurrency;
                      const revenue = partnerDeals
                        .filter((deal) => deal.status === "won" && deal.currency === partnerCurrency)
                        .reduce((sum, deal) => sum + deal.amountCents, 0);
                      const pending = partnerCommissions
                        .filter((commission) => commission.currency === partnerCurrency && commission.status !== "paid" && commission.status !== "cancelled")
                        .reduce((sum, commission) => sum + commission.amountCents, 0);

                      return (
                        <tr key={partner.id} className="transition hover:bg-white/[0.025]">
                          <td className="px-6 py-5">
                            <div className="font-medium text-white/90">{partner.name}</div>
                            <div className="mt-1 text-xs text-white/35">{partner.email}</div>
                            <div className="mt-2 text-[11px] text-cyan-300/60">{t("referralCode")}: {partner.referralCode}</div>
                          </td>
                          <td className="px-4 py-5 text-white/55">{t(`types.${partner.type}`)}</td>
                          <td className="px-4 py-5">
                            <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs ${statusClasses(partner.status)}`}>{t(`statuses.${partner.status}`)}</span>
                          </td>
                          <td className="px-4 py-5 text-right tabular-nums text-white/65">{referralsByPartner.get(partner.id)?.length ?? 0}</td>
                          <td className="px-4 py-5 text-right tabular-nums text-white/65">{money(revenue, partnerCurrency, locale)}</td>
                          <td className="px-6 py-5 text-right tabular-nums text-white/65">{money(pending, partnerCurrency, locale)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </main>
    </MainLayout>
  );
}
