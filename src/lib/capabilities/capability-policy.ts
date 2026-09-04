export type ClaraPlan = "essential" | "pro" | "premium";
export type CapabilityAccessMode = "read" | "prepare" | "write" | "execute";
export type CapabilityApprovalPolicy = "never" | "required";

export interface CapabilityPolicy {
  readonly accessMode: CapabilityAccessMode;
  readonly requiredPlan: ClaraPlan;
  readonly approvalPolicy: CapabilityApprovalPolicy;
  readonly sequential: boolean;
}

const READ_CAPABILITIES = new Set([
  "search-drive", "read-sheet", "find-sheet-row", "read-calendar",
  "read-gmail", "find-document", "read-document",
  "github.repository.list", "github.repository.read", "github.branch.list",
  "github.file.read", "github.commit.list", "github.issue.list",
  "github.issue.read", "github.pull_request.list", "github.pull_request.read",
  "github.checks.read",
]);

const PREPARE_CAPABILITIES = new Set([
  "generate-document", "make.scenario.prepare",
]);

export function getCapabilityPolicy(capabilityId: string): CapabilityPolicy {
  if (READ_CAPABILITIES.has(capabilityId)) {
    return { accessMode: "read", requiredPlan: "essential", approvalPolicy: "never", sequential: false };
  }
  if (PREPARE_CAPABILITIES.has(capabilityId)) {
    return { accessMode: "prepare", requiredPlan: "pro", approvalPolicy: "never", sequential: false };
  }
  if (capabilityId === "make.scenario.execute") {
    return { accessMode: "execute", requiredPlan: "premium", approvalPolicy: "required", sequential: true };
  }
  return { accessMode: "write", requiredPlan: "premium", approvalPolicy: "required", sequential: true };
}

const PLAN_RANK: Record<ClaraPlan, number> = { essential: 1, pro: 2, premium: 3 };

export interface CapabilityExecutionPrincipal {
  readonly actorId: string;
  readonly workspaceId: string;
  readonly plan: ClaraPlan;
  readonly approvedCapabilityIds?: readonly string[];
}

export type CapabilityPolicyDecision =
  | { allowed: true; policy: CapabilityPolicy }
  | { allowed: false; policy: CapabilityPolicy; code: "PLAN_REQUIRED" | "APPROVAL_REQUIRED"; message: string };

export function authorizeCapability(
  capabilityId: string,
  principal: CapabilityExecutionPrincipal,
): CapabilityPolicyDecision {
  const policy = getCapabilityPolicy(capabilityId);
  if (PLAN_RANK[principal.plan] < PLAN_RANK[policy.requiredPlan]) {
    return {
      allowed: false,
      policy,
      code: "PLAN_REQUIRED",
      message: `La capacité ${capabilityId} nécessite l’offre ${policy.requiredPlan}.`,
    };
  }
  if (
    policy.approvalPolicy === "required" &&
    !principal.approvedCapabilityIds?.includes(capabilityId)
  ) {
    return {
      allowed: false,
      policy,
      code: "APPROVAL_REQUIRED",
      message: `Une confirmation explicite est requise avant d’exécuter ${capabilityId}.`,
    };
  }
  return { allowed: true, policy };
}
