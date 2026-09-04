import { DatabaseConnectionRepository } from "@/lib/connections/connection-repository";
import { ConnectionResolver } from "@/lib/connections/connection-resolver";
import { CredentialStore } from "@/lib/connections/credential-store";
import { StripeConnectorAdapter, type StripeCapabilityInput } from "@/lib/connectors/stripe/adapter";
import { STRIPE_CAPABILITIES } from "@/lib/connectors/stripe/definition";
import type { ExternalProductConfig } from "./config";

export interface ExternalCapabilityRequest {
  readonly capability: string;
  readonly input: unknown;
}

export interface ExternalCapabilityResponse {
  readonly success: boolean;
  readonly productId: string;
  readonly capability: string;
  readonly data?: unknown;
  readonly error?: string;
}

export class ExternalCapabilityGatewayError extends Error {
  constructor(
    public readonly code:
      | "CAPABILITY_NOT_ALLOWED"
      | "CAPABILITY_NOT_SUPPORTED"
      | "CONNECTION_NOT_CONFIGURED"
      | "INVALID_REQUEST",
    message: string,
  ) {
    super(message);
    this.name = "ExternalCapabilityGatewayError";
  }
}

const STRIPE_CAPABILITY_IDS = new Set<string>(Object.values(STRIPE_CAPABILITIES));

export interface ExternalProviderExecutor {
  execute(
    product: ExternalProductConfig,
    request: ExternalCapabilityRequest,
  ): Promise<unknown>;
}

export class ClaraExternalProviderExecutor implements ExternalProviderExecutor {
  private readonly connections = new DatabaseConnectionRepository();
  private readonly credentials = new CredentialStore();
  private readonly resolver = new ConnectionResolver(this.connections, this.credentials);

  async execute(
    product: ExternalProductConfig,
    request: ExternalCapabilityRequest,
  ): Promise<unknown> {
    if (!STRIPE_CAPABILITY_IDS.has(request.capability)) {
      throw new ExternalCapabilityGatewayError(
        "CAPABILITY_NOT_SUPPORTED",
        `External capability is not supported yet: ${request.capability}`,
      );
    }

    const connection = await this.connections.findByWorkspaceAndProvider(
      product.workspaceId,
      "stripe",
    );
    if (!connection) {
      throw new ExternalCapabilityGatewayError(
        "CONNECTION_NOT_CONFIGURED",
        "Stripe is not configured for this Clara OS workspace.",
      );
    }

    const adapter = new StripeConnectorAdapter(this.resolver);
    return adapter.execute(connection.id, {
      capability: request.capability,
      input: request.input,
    } as StripeCapabilityInput);
  }
}

export class ExternalCapabilityGateway {
  constructor(
    private readonly executor: ExternalProviderExecutor = new ClaraExternalProviderExecutor(),
  ) {}

  async execute(
    product: ExternalProductConfig,
    request: ExternalCapabilityRequest,
  ): Promise<ExternalCapabilityResponse> {
    const capability = request.capability?.trim();
    if (!capability) {
      throw new ExternalCapabilityGatewayError(
        "INVALID_REQUEST",
        "A capability id is required.",
      );
    }

    if (!product.capabilities.includes(capability)) {
      throw new ExternalCapabilityGatewayError(
        "CAPABILITY_NOT_ALLOWED",
        `Capability is not allowed for ${product.productId}: ${capability}`,
      );
    }

    const data = await this.executor.execute(product, {
      capability,
      input: request.input,
    });

    return {
      success: true,
      productId: product.productId,
      capability,
      data,
    };
  }
}
