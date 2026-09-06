import { MAGICQ_CAPABILITIES } from "@/lib/connectors/internal/chamsys/magicq";

const parameters = {
  connectionId: {
    type: "string",
    description: "Universal Connection identifier for the target MagicQ installation.",
    required: true,
  },
  fixtureId: {
    type: "string",
    description: "Stable Clara fixture identifier resolved to an installation-specific MagicQ channel.",
    required: true,
  },
  intensityPercent: {
    type: "number",
    description: "Requested fixture intensity from 0 to 100 percent.",
    required: true,
  },
};

export type MagicQLightingCapability = {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly version: string;
  readonly category: string;
  readonly inputSchema: typeof parameters;
};

export const MagicQFixtureIntensityCapabilityDefinition: MagicQLightingCapability = {
  id: MAGICQ_CAPABILITIES.FIXTURE_INTENSITY_SET,
  name: "Set lighting fixture intensity",
  description:
    "Sets the intensity of one Clara fixture through its configured ChamSys MagicQ connection.",
  version: "1.0.0",
  category: "Lighting",
  inputSchema: parameters,
};
