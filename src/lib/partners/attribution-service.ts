import type { Partner, Referral } from "./types";

export interface AttributionResult {
  partnerId?: string;
  referralId?: string;
  attributed: boolean;
  reason: "valid_referral" | "partner_inactive" | "referral_not_found" | "invalid_referral";
}

export function attributeReferral(
  workspaceId: string,
  referralCode: string,
  partners: Partner[],
  referrals: Referral[],
): AttributionResult {
  const normalizedWorkspaceId = workspaceId.trim();
  const normalizedCode = referralCode.trim().toLowerCase();
  if (!normalizedWorkspaceId || !normalizedCode) {
    return { attributed: false, reason: "invalid_referral" };
  }

  const referral = [...referrals]
    .filter((item) =>
      item.workspaceId === normalizedWorkspaceId &&
      item.referralCode.trim().toLowerCase() === normalizedCode,
    )
    .sort((a, b) => b.capturedAt.localeCompare(a.capturedAt))[0];

  if (!referral) {
    return { attributed: false, reason: "referral_not_found" };
  }

  const partner = partners.find((item) =>
    item.workspaceId === normalizedWorkspaceId && item.id === referral.partnerId,
  );
  if (!partner || partner.status !== "active") {
    return {
      partnerId: referral.partnerId,
      referralId: referral.id,
      attributed: false,
      reason: "partner_inactive",
    };
  }

  return {
    partnerId: partner.id,
    referralId: referral.id,
    attributed: true,
    reason: "valid_referral",
  };
}
