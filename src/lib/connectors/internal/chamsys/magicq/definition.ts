import type { ConnectorDefinition } from "@/lib/connectors/core/connector";

export const MAGICQ_CAPABILITIES = {
  FIXTURE_INTENSITY_SET: "lighting.fixture.intensity.set",
} as const;

export const MagicQConnectorDefinition: ConnectorDefinition = {
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
