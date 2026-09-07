import assert from "node:assert/strict";
import test from "node:test";

import {
  InMemoryPartnerStore,
  attributeReferral,
  calculateCommission,
  type CommissionRule,
  type Partner,
  type Referral,
} from "@/lib/partners";

const now = "2026-09-07T03:00:00.000Z";

function partner(overrides: Partial<Partner> = {}): Partner {
  return {
    id: "partner-1",
    workspaceId: "workspace-a",
    name: "Partner One",
    email: "partner@example.com",
    type: "referrer",
    status: "active",
    referralCode: "CLARA-P1",
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function referral(overrides: Partial<Referral> = {}): Referral {
  return {
    id: "referral-1",
    workspaceId: "workspace-a",
    partnerId: "partner-1",
    referralCode: "CLARA-P1",
    status: "captured",
    capturedAt: now,
    ...overrides,
  };
}

function percentageRule(overrides: Partial<CommissionRule> = {}): CommissionRule {
  return {
    id: "rule-20",
    workspaceId: "workspace-a",
    name: "20 percent",
    model: "percentage",
    percentageBps: 2_000,
    recurringMonths: 12,
    active: true,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

test("referral attribution is case-insensitive and uses the latest matching capture", () => {
  const partners = [partner(), partner({ id: "partner-2", referralCode: "CLARA-P2" })];
  const referrals = [
    referral({ id: "old", capturedAt: "2026-09-01T00:00:00.000Z" }),
    referral({ id: "latest", partnerId: "partner-2", capturedAt: "2026-09-06T00:00:00.000Z" }),
  ];

  assert.deepEqual(attributeReferral(" clara-p1 ", partners, referrals), {
    partnerId: "partner-2",
    referralId: "latest",
    attributed: true,
    reason: "valid_referral",
  });
});

test("inactive partners cannot receive referral attribution", () => {
  const result = attributeReferral(
    "CLARA-P1",
    [partner({ status: "paused" })],
    [referral()],
  );

  assert.equal(result.attributed, false);
  assert.equal(result.reason, "partner_inactive");
});

test("percentage commission calculates exact cents and respects recurrence limit", () => {
  const eligible = calculateCommission({
    sourceAmountCents: 39_900,
    currency: "EUR",
    rule: percentageRule(),
    periodIndex: 1,
  });

  assert.equal(eligible.eligible, true);
  assert.equal(eligible.amountCents, 7_980);

  const expired = calculateCommission({
    sourceAmountCents: 39_900,
    currency: "EUR",
    rule: percentageRule(),
    periodIndex: 13,
  });

  assert.equal(expired.eligible, false);
  assert.equal(expired.amountCents, 0);
  assert.equal(expired.reason, "commission_period_expired");
});

test("fixed commission is supported independently from source amount", () => {
  const result = calculateCommission({
    sourceAmountCents: 75_000,
    currency: "EUR",
    rule: percentageRule({ model: "fixed", percentageBps: undefined, fixedAmountCents: 15_000 }),
  });

  assert.equal(result.eligible, true);
  assert.equal(result.amountCents, 15_000);
});

test("partner store isolates workspaces", () => {
  const store = new InMemoryPartnerStore();
  store.savePartner(partner());
  store.savePartner(partner({ id: "partner-b", workspaceId: "workspace-b", email: "b@example.com" }));

  assert.deepEqual(store.listPartners("workspace-a").map((item) => item.id), ["partner-1"]);
  assert.deepEqual(store.listPartners("workspace-b").map((item) => item.id), ["partner-b"]);
  assert.equal(store.getPartner("workspace-b", "partner-1"), null);
});

test("store rejects cross-workspace referral references", () => {
  const store = new InMemoryPartnerStore();
  store.savePartner(partner());

  assert.throws(
    () => store.saveReferral(referral({ workspaceId: "workspace-b" })),
    /same workspace/,
  );
});

test("audit events are append-only by id", () => {
  const store = new InMemoryPartnerStore();
  const event = {
    id: "audit-1",
    workspaceId: "workspace-a",
    actorId: "owner",
    action: "partner.created",
    entityType: "partner" as const,
    entityId: "partner-1",
    createdAt: now,
  };

  store.appendAuditEvent(event);
  assert.throws(() => store.appendAuditEvent(event), /already exists/);
  assert.equal(store.snapshot("workspace-a").auditEvents.length, 1);
});
