import assert from "node:assert/strict";
import test from "node:test";

import { authorizeCapability, getCapabilityPolicy } from "@/lib/capabilities/capability-policy";

const essential = { actorId: "owner", workspaceId: "workspace", plan: "essential" as const };
const premium = { actorId: "owner", workspaceId: "workspace", plan: "premium" as const };

test("read capabilities remain available to Essential without approval", () => {
  assert.deepEqual(authorizeCapability("read-calendar", essential).allowed, true);
});

test("write capabilities require Premium and explicit approval", () => {
  const planDenied = authorizeCapability("send-gmail", essential);
  assert.equal(planDenied.allowed, false);
  assert.equal(!planDenied.allowed && planDenied.code, "PLAN_REQUIRED");

  const approvalDenied = authorizeCapability("send-gmail", premium);
  assert.equal(approvalDenied.allowed, false);
  assert.equal(!approvalDenied.allowed && approvalDenied.code, "APPROVAL_REQUIRED");

  assert.equal(authorizeCapability("send-gmail", {
    ...premium,
    approvedCapabilityIds: ["send-gmail"],
  }).allowed, true);
});

test("Make preparation and execution use distinct policies", () => {
  assert.equal(getCapabilityPolicy("make.scenario.prepare").accessMode, "prepare");
  assert.equal(getCapabilityPolicy("make.scenario.execute").accessMode, "execute");
  assert.equal(getCapabilityPolicy("make.scenario.execute").approvalPolicy, "required");
});
