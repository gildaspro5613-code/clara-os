import type { ConnectionResolver } from "@/lib/connections/connection-resolver";
import { StripeClient, type StripeFetch } from "./client";
import { STRIPE_CAPABILITIES } from "./definition";
import type {
  StripeBillingPortalInput,
  StripeCheckoutInput,
  StripeCredentials,
  StripeCustomerSummary,
} from "./types";

export type StripeCapabilityInput =
  | { capability: typeof STRIPE_CAPABILITIES.CUSTOMER_SEARCH; input: { email: string } }
  | { capability: typeof STRIPE_CAPABILITIES.CUSTOMER_UPSERT; input: { email: string; name?: string; metadata?: Readonly<Record<string, string>> } }
  | { capability: typeof STRIPE_CAPABILITIES.CHECKOUT_SESSION_CREATE; input: StripeCheckoutInput }
  | { capability: typeof STRIPE_CAPABILITIES.SUBSCRIPTION_READ; input: { subscriptionId: string } }
  | { capability: typeof STRIPE_CAPABILITIES.PAYMENT_READ; input: { paymentIntentId: string } }
  | { capability: typeof STRIPE_CAPABILITIES.BILLING_PORTAL_SESSION_CREATE; input: StripeBillingPortalInput };

export interface StripeCapabilityResult {
  readonly provider: "stripe";
  readonly capability: StripeCapabilityInput["capability"];
  readonly data: unknown;
}

function requireOfferPrice(credentials: StripeCredentials, offerKey: string): string {
  const normalized = offerKey.trim();
  if (!normalized) throw new Error("A Clara offer key is required.");
  const priceId = credentials.prices[normalized];
  if (!priceId) throw new Error(`Stripe price is not configured for Clara offer: ${normalized}`);
  return priceId;
}

/**
 * Provider adapter invoked only after Runtime/Autonomy Gate authorization.
 * Stripe secret keys and price ids remain in Clara OS credentials; callers use
 * stable offer keys such as essential/pro/premium.
 */
export class StripeConnectorAdapter {
  constructor(
    private readonly resolver: ConnectionResolver,
    private readonly fetcher?: StripeFetch,
  ) {}

  async execute(connectionId: string, request: StripeCapabilityInput): Promise<StripeCapabilityResult> {
    const { credentials } = await this.resolver.resolve<StripeCredentials>(connectionId, "stripe");
    const client = new StripeClient(credentials.secretKey, this.fetcher);

    switch (request.capability) {
      case STRIPE_CAPABILITIES.CUSTOMER_SEARCH:
        return { provider: "stripe", capability: request.capability, data: await client.searchCustomer(request.input.email) };

      case STRIPE_CAPABILITIES.CUSTOMER_UPSERT: {
        const existing = await client.searchCustomer(request.input.email);
        const data: StripeCustomerSummary = existing ?? await client.createCustomer(request.input);
        return { provider: "stripe", capability: request.capability, data };
      }

      case STRIPE_CAPABILITIES.CHECKOUT_SESSION_CREATE: {
        const priceId = requireOfferPrice(credentials, request.input.offerKey);
        return {
          provider: "stripe",
          capability: request.capability,
          data: await client.createCheckoutSession(priceId, request.input),
        };
      }

      case STRIPE_CAPABILITIES.SUBSCRIPTION_READ:
        return { provider: "stripe", capability: request.capability, data: await client.getSubscription(request.input.subscriptionId) };

      case STRIPE_CAPABILITIES.PAYMENT_READ:
        return { provider: "stripe", capability: request.capability, data: await client.getPayment(request.input.paymentIntentId) };

      case STRIPE_CAPABILITIES.BILLING_PORTAL_SESSION_CREATE:
        return { provider: "stripe", capability: request.capability, data: await client.createBillingPortalSession(request.input) };
    }
  }
}
