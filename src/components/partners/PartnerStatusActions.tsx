"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { PartnerStatus } from "@/lib/partners/types";

type Props = {
  partnerId: string;
  status: PartnerStatus;
};

const NEXT_STATUSES: Record<PartnerStatus, PartnerStatus[]> = {
  pending: ["active", "closed"],
  active: ["paused", "closed"],
  paused: ["active", "closed"],
  closed: [],
};

export default function PartnerStatusActions({ partnerId, status }: Props) {
  const t = useTranslations("partnersPage");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function updateStatus(nextStatus: PartnerStatus) {
    setError(null);
    const response = await fetch(`/api/partners/${partnerId}/status`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });
    const payload = await response.json().catch(() => null) as { error?: string } | null;
    if (!response.ok) {
      setError(payload?.error ?? t("detail.actions.error"));
      return;
    }
    startTransition(() => router.refresh());
  }

  const actions = NEXT_STATUSES[status];
  if (actions.length === 0) {
    return <p className="text-sm text-white/40">{t("detail.actions.archived")}</p>;
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {actions.map((nextStatus) => (
          <button
            key={nextStatus}
            type="button"
            disabled={isPending}
            onClick={() => void updateStatus(nextStatus)}
            className="rounded-xl border border-cyan-400/20 bg-cyan-400/[0.06] px-4 py-2 text-sm text-cyan-200 transition hover:bg-cyan-400/[0.12] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isPending ? t("detail.actions.updating") : t(`detail.actions.${nextStatus}`)}
          </button>
        ))}
      </div>
      {error && <p className="mt-3 text-xs text-rose-300">{error}</p>}
    </div>
  );
}
