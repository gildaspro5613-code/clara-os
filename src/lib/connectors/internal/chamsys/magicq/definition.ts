import type { ConnectorCapabilityDefinition } from "@/lib/connectors/core/connector";

export const MAGICQ_CAPABILITIES = {
  FIXTURE_INTENSITY_SET: "lighting.fixture.intensity.set",
} as const;

export interface MagicQConnectorDefinitionShape {
  readonly id: "chamsys.magicq";
  readonly name: "ChamSys MagicQ";
  readonly version: "1.0.0";
  readonly authentication: {
    readonly type: "none";
  };
  readonly capabilities: readonly ConnectorCapabilityDefinition[];
}

export const MagicQConnectorDefinition: MagicQConnectorDefinitionShape = {
  id: "chamsys.magicq",
  name: "ChamSys MagicQ",
  version: "1.0.0",
  authentication: { type: "none" },
  capabilities: [
    {
      id: MAGICQ_CAPABILITIES.FIXTURE_INTENSITY_SET,
      operationType: "EXECUTE",
      description:
        "Set the intensity of one resolved MagicQ DMX channel through CREP.",
    },
  ],
};
