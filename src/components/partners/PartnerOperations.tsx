"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { BadgeEuro, BriefcaseBusiness, Link2, LoaderCircle } from "lucide-react";

import type { CommissionRule, Deal } from "@/lib/partners/types";

type Props = {
  partnerId: string;
  partnerActive: boolean;
  wonDeals: Pick<Deal, "id" | "offerId" | "currency" | "amountCents">[];
  rules: Pick<CommissionRule, "id" | "name" | "model" | "percentageBps" | "fixedAmountCents" | "active">[];
};

type Action = "referral" | "deal" | "commission";

export default function PartnerOperations({ partnerId, partnerActive, wonDeals, rules }: Props) {
  const t = useTranslations("partnersPage");
  const router = useRouter();
  const [busy, setBusy] = useState<Action | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function submit(path: string, body: Record<string, unknown>, action: Action) {
    setBusy(action);
    setMessage(null);
    try {
      const response = await fetch(path, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await response.json() as { success?: boolean; error?: string; reason?: string };
      if (!response.ok || !result.success) {
        setMessage(result.error ?? result.reason ?? t("detail.operations.error"));
        return;
      }
      setMessage(t(`detail.operations.${action}Success`));
      router.refresh();
    } catch {
      setMessage(t("detail.operations.error"));
    } finally {
      setBusy(null);
    }
  }

  function onReferral(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const email = String(data.get("email") ?? "").trim();
    if (!email) return;
    void submit(`/api/partners/${partnerId}/referrals`, { email, status: "captured" }, "referral");
    event.currentTarget.reset();
  }

  function onDeal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const offerId = String(data.get("offerId") ?? "").trim();
    const amount = Number(data.get("amount"));
    const currency = String(data.get("currency") ?? "EUR").trim().toUpperCase();
    if (!offerId || !Number.isFinite(amount) || amount < 0) return;
    void submit(`/api/partners/${partnerId}/deals`, {
      offerId,
      status: "won",
      currency,
      amountCents: Math.round(amount * 100),
    }, "deal");
    event.currentTarget.reset();
  }

  function onCommission(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const dealId = String(data.get("dealId") ?? "");
    const ruleId = String(data.get("ruleId") ?? "");
    const periodIndex = Number(data.get("periodIndex") ?? 1);
    if (!dealId || !ruleId) return;
    void submit(`/api/partners/${partnerId}/commissions`, { dealId, ruleId, periodIndex }, "commission");
  }

  const field = "w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-cyan-400/35";
  const button = "inline-flex items-center justify-center gap-2 rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-3.5 py-2.5 text-sm text-cyan-100 transition hover:bg-cyan-400/15 disabled:cursor-not-allowed disabled:opacity-40";

  return (
    <section className="mt-6 rounded-3xl border border-white/10 bg-white/[0.02] p-5 sm:p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-medium">{t("detail.operations.title")}</h2>
          <p className="mt-1 text-sm text-white/40">{t("detail.operations.subtitle")}</p>
        </div>
        {!partnerActive && <span className="text-xs text-amber-300/70">{t("detail.operations.activeRequired")}</span>}
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-3">
        <form onSubmit={onReferral} className="rounded-2xl border border-white/[0.07] bg-black/10 p-4">
          <div className="mb-4 flex items-center gap-2 text-sm font-medium"><Link2 size={16} className="text-cyan-300" />{t("detail.operations.referralTitle")}</div>
          <input className={field} name="email" type="email" required placeholder={t("detail.operations.email")} disabled={!partnerActive || busy !== null} />
          <button className={`${button} mt-3 w-full`} type="submit" disabled={!partnerActive || busy !== null}>{busy === "referral" && <LoaderCircle size={15} className="animate-spin" />}{t("detail.operations.addReferral")}</button>
        </form>

        <form onSubmit={onDeal} className="rounded-2xl border border-white/[0.07] bg-black/10 p-4">
          <div className="mb-4 flex items-center gap-2 text-sm font-medium"><BriefcaseBusiness size={16} className="text-cyan-300" />{t("detail.operations.dealTitle")}</div>
          <div className="space-y-2">
            <input className={field} name="offerId" required placeholder={t("detail.operations.offer")} disabled={!partnerActive || busy !== null} />
            <div className="grid grid-cols-[1fr_90px] gap-2">
              <input className={field} name="amount" type="number" min="0" step="0.01" required placeholder={t("detail.operations.amount")} disabled={!partnerActive || busy !== null} />
              <input className={field} name="currency" defaultValue="EUR" maxLength={3} required aria-label={t("detail.operations.currency")} disabled={!partnerActive || busy !== null} />
            </div>
          </div>
          <button className={`${button} mt-3 w-full`} type="submit" disabled={!partnerActive || busy !== null}>{busy === "deal" && <LoaderCircle size={15} className="animate-spin" />}{t("detail.operations.addDeal")}</button>
        </form>

        <form onSubmit={onCommission} className="rounded-2xl border border-white/[0.07] bg-black/10 p-4">
          <div className="mb-4 flex items-center gap-2 text-sm font-medium"><BadgeEuro size={16} className="text-cyan-300" />{t("detail.operations.commissionTitle")}</div>
          <div className="space-y-2">
            <select className={field} name="dealId" required disabled={busy !== null || wonDeals.length === 0} defaultValue="">
              <option value="" disabled>{t("detail.operations.selectDeal")}</option>
              {wonDeals.map((deal) => <option key={deal.id} value={deal.id}>{deal.offerId} · {(deal.amountCents / 100).toFixed(2)} {deal.currency}</option>)}
            </select>
            <select className={field} name="ruleId" required disabled={busy !== null || rules.filter((rule) => rule.active).length === 0} defaultValue="">
              <option value="" disabled>{t("detail.operations.selectRule")}</option>
              {rules.filter((rule) => rule.active).map((rule) => <option key={rule.id} value={rule.id}>{rule.name}</option>)}
            </select>
            <input className={field} name="periodIndex" type="number" min="1" step="1" defaultValue="1" aria-label={t("detail.operations.period")} disabled={busy !== null} />
          </div>
          <button className={`${button} mt-3 w-full`} type="submit" disabled={busy !== null || wonDeals.length === 0 || rules.filter((rule) => rule.active).length === 0}>{busy === "commission" && <LoaderCircle size={15} className="animate-spin" />}{t("detail.operations.prepareCommission")}</button>
        </form>
      </div>

      {message && <p className="mt-4 text-sm text-cyan-200/70">{message}</p>}
    </section>
  );
}
