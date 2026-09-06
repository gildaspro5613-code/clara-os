import type { CommissionRule } from "./types";

export interface CommissionCalculationInput {
  sourceAmountCents: number;
  currency: string;
  rule: CommissionRule;
  periodIndex?: number;
}

export interface CommissionCalculationResult {
  currency: string;
  sourceAmountCents: number;
  amountCents: number;
  periodIndex: number;
  eligible: boolean;
  reason?: string;
}

function assertMoney(value: number, label: string): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${label} must be a non-negative integer amount in cents`);
  }
}

export function calculateCommission(
  input: CommissionCalculationInput,
): CommissionCalculationResult {
  const { sourceAmountCents, currency, rule } = input;
  const periodIndex = input.periodIndex ?? 1;

  assertMoney(sourceAmountCents, "sourceAmountCents");

  if (!currency.trim()) {
    throw new Error("currency is required");
  }

  if (!Number.isInteger(periodIndex) || periodIndex < 1) {
    throw new Error("periodIndex must be a positive integer");
  }

  if (!rule.active) {
    return {
      currency,
      sourceAmountCents,
      amountCents: 0,
      periodIndex,
      eligible: false,
      reason: "commission_rule_inactive",
    };
  }

  if (rule.recurringMonths && periodIndex > rule.recurringMonths) {
    return {
      currency,
      sourceAmountCents,
      amountCents: 0,
      periodIndex,
      eligible: false,
      reason: "commission_period_expired",
    };
  }

  let amountCents: number;

  if (rule.model === "percentage") {
    const bps = rule.percentageBps;
    if (!Number.isInteger(bps) || bps === undefined || bps < 0 || bps > 10_000) {
      throw new Error("percentage commission requires percentageBps between 0 and 10000");
    }
    amountCents = Math.round((sourceAmountCents * bps) / 10_000);
  } else {
    const fixed = rule.fixedAmountCents;
    if (!Number.isInteger(fixed) || fixed === undefined || fixed < 0) {
      throw new Error("fixed commission requires a non-negative fixedAmountCents");
    }
    amountCents = fixed;
  }

  return {
    currency,
    sourceAmountCents,
    amountCents,
    periodIndex,
    eligible: true,
  };
}
