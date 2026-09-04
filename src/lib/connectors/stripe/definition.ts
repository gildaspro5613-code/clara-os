import type { ConnectorDefinition, ConnectorOperationType } from "../core/connector";

export const STRIPE_CAPABILITIES = {
  CUSTOMER_SEARCH: "stripe.customer.search",
  CUSTOMER_UPSERT: "stripe.customer.upsert",
  CHECKOUT_SESSION_CREATE: "stripe.checkout.session.create",
  SUBSCRIPTION_READ: "stripe.subscription.read",
  PAYMENT_READ: "stripe.payment.read",
  BILLING_PORTAL_SESSION_CREATE: "stripe.billing_portal.session.create",
} as const;

const capability = (
  id: string,
  operationType: ConnectorOperationType,
  description: string,
) => ({ id, operationType, description });

export const StripeConnectorDefinition: ConnectorDefinition = {
  id: "stripe",
  name: "Stripe",
  version: "1.0.0",
  authentication: { type: "api_key", credentialReference: "connectionId" },
  capabilities: [
    capability(STRIPE_CAPABILITIES.CUSTOMER_SEARCH, "READ", "Search Stripe customers."),
    capability(STRIPE_CAPABILITIES.CUSTOMER_UPSERT, "WRITE", "Create a Stripe customer when none exists."),
    capability(STRIPE_CAPABILITIES.CHECKOUT_SESSION_CREATE, "EXECUTE", "Create a Stripe Checkout Session for a configured Clara offer."),
    capability(STRIPE_CAPABILITIES.SUBSCRIPTION_READ, "READ", "Read a Stripe subscription."),
    capability(STRIPE_CAPABILITIES.PAYMENT_READ, "READ", "Read a Stripe payment intent."),
    capability(STRIPE_CAPABILITIES.BILLING_PORTAL_SESSION_CREATE, "EXECUTE", "Create a Stripe customer billing portal session."),
  ],
};
