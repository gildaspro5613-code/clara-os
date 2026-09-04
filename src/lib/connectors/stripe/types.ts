export interface StripeCredentials {
  readonly secretKey: string;
  readonly webhookSecret?: string;
  readonly prices: Readonly<Record<string, string>>;
}

export interface StripeCustomerSummary {
  readonly id: string;
  readonly email?: string | null;
  readonly name?: string | null;
}

export interface StripeCheckoutInput {
  readonly offerKey: string;
  readonly mode?: "subscription" | "payment";
  readonly quantity?: number;
  readonly customerId?: string;
  readonly customerEmail?: string;
  readonly successUrl: string;
  readonly cancelUrl: string;
  readonly clientReferenceId?: string;
  readonly metadata?: Readonly<Record<string, string>>;
}

export interface StripeCheckoutResult {
  readonly id: string;
  readonly url: string | null;
}

export interface StripeBillingPortalInput {
  readonly customerId: string;
  readonly returnUrl: string;
}

export interface StripeBillingPortalResult {
  readonly id: string;
  readonly url: string;
}

export interface StripeSubscriptionSummary {
  readonly id: string;
  readonly status: string;
  readonly customer: string | null;
  readonly currentPeriodEnd?: number;
}

export interface StripePaymentSummary {
  readonly id: string;
  readonly status: string;
  readonly amount: number;
  readonly currency: string;
  readonly customer: string | null;
}
