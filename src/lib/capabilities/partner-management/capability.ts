const listParameters = {
  status: {
    type: "string",
    description: "Optional partner status filter: pending, active, paused, or closed.",
    required: false,
  },
};

const partnerParameters = {
  partnerId: {
    type: "string",
    description: "Partner identifier in the current Clara workspace.",
    required: true,
  },
};

const commissionParameters = {
  partnerId: {
    type: "string",
    description: "Partner identifier in the current Clara workspace.",
    required: true,
  },
  dealId: {
    type: "string",
    description: "Won deal identifier used as the commission source.",
    required: true,
  },
  ruleId: {
    type: "string",
    description: "Active commission rule identifier.",
    required: true,
  },
  periodIndex: {
    type: "number",
    description: "Positive commission period index. Defaults to 1 when omitted by the caller.",
    required: false,
  },
};

export type PartnerManagementCapability = {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly version: string;
  readonly category: string;
  readonly inputSchema: Record<string, { type: string; description: string; required: boolean }>;
};

export const PartnerListCapabilityDefinition: PartnerManagementCapability = {
  id: "partners.list",
  name: "List partners",
  description: "Reads the partner network for the current Clara workspace, optionally filtered by status.",
  version: "1.0.0",
  category: "Partner Management",
  inputSchema: listParameters,
};

export const PartnerPerformanceSummaryCapabilityDefinition: PartnerManagementCapability = {
  id: "partners.performance.summary",
  name: "Summarize partner performance",
  description: "Reads partner, referral, won revenue and pending commission performance for the current Clara workspace.",
  version: "1.0.0",
  category: "Partner Management",
  inputSchema: {},
};

export const PartnerDetailCapabilityDefinition: PartnerManagementCapability = {
  id: "partners.get",
  name: "Read partner details",
  description: "Reads one partner and its referrals, deals and commissions in the current Clara workspace.",
  version: "1.0.0",
  category: "Partner Management",
  inputSchema: partnerParameters,
};

export const PartnerCommissionPrepareCapabilityDefinition: PartnerManagementCapability = {
  id: "partners.commissions.calculate",
  name: "Prepare partner commission",
  description: "Prepares a deterministic draft commission from a won deal. It never approves or pays a commission.",
  version: "1.0.0",
  category: "Partner Management",
  inputSchema: commissionParameters,
};

export const PartnerManagementCapabilityDefinitions: PartnerManagementCapability[] = [
  PartnerListCapabilityDefinition,
  PartnerDetailCapabilityDefinition,
  PartnerPerformanceSummaryCapabilityDefinition,
  PartnerCommissionPrepareCapabilityDefinition,
];
