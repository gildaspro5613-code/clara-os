import type {
  StripeBillingPortalInput,
  StripeBillingPortalResult,
  StripeCheckoutInput,
  StripeCheckoutResult,
  StripeCustomerSummary,
  StripePaymentSummary,
  StripeSubscriptionSummary,
} from "./types";

export type StripeFetch = typeof fetch;

export class StripeApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "StripeApiError";
  }
}

function requireHttpsUrl(value: string, field: string): string {
  const url = new URL(value);
  if (url.protocol !== "https:") throw new Error(`${field} must use HTTPS.`);
  return url.toString();
}

function appendMetadata(params: URLSearchParams, metadata?: Readonly<Record<string, string>>) {
  if (!metadata) return;
  for (const [key, value] of Object.entries(metadata)) {
    params.set(`metadata[${key}]`, value);
  }
}

export class StripeClient {
  constructor(
    private readonly secretKey: string,
    private readonly fetcher: StripeFetch = fetch,
    private readonly baseUrl = "https://api.stripe.com/v1",
  ) {
    if (!secretKey.trim()) throw new Error("Stripe secret key is required.");
  }

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const headers = new Headers(init.headers);
    headers.set("authorization", `Bearer ${this.secretKey}`);
    if (init.body) headers.set("content-type", "application/x-www-form-urlencoded");

    const response = await this.fetcher(`${this.baseUrl}${path}`, { ...init, headers });
    const text = await response.text();
    let body: unknown = {};
    if (text) {
      try { body = JSON.parse(text); } catch { body = {}; }
    }

    if (!response.ok) {
      const error = body as { error?: { code?: string; message?: string; type?: string } };
      throw new StripeApiError(
        response.status,
        error.error?.code ?? error.error?.type ?? "STRIPE_ERROR",
        error.error?.message ?? `Stripe request failed with status ${response.status}.`,
      );
    }

    return body as T;
  }

  async searchCustomer(email: string): Promise<StripeCustomerSummary | null> {
    const normalized = email.trim().toLowerCase();
    if (!normalized) throw new Error("Customer email is required.");
    const result = await this.request<{ data?: StripeCustomerSummary[] }>(
      `/customers/search?query=${encodeURIComponent(`email:'${normalized.replaceAll("'", "\\'")}'`)}`,
    );
    return result.data?.[0] ?? null;
  }

  async createCustomer(input: { email: string; name?: string; metadata?: Readonly<Record<string, string>> }): Promise<StripeCustomerSummary> {
    const params = new URLSearchParams();
    params.set("email", input.email.trim().toLowerCase());
    if (input.name) params.set("name", input.name);
    appendMetadata(params, input.metadata);
    return this.request<StripeCustomerSummary>("/customers", { method: "POST", body: params.toString() });
  }

  async createCheckoutSession(priceId: string, input: StripeCheckoutInput): Promise<StripeCheckoutResult> {
    const params = new URLSearchParams();
    params.set("mode", input.mode ?? "subscription");
    params.set("line_items[0][price]", priceId);
    params.set("line_items[0][quantity]", String(input.quantity ?? 1));
    params.set("success_url", requireHttpsUrl(input.successUrl, "successUrl"));
    params.set("cancel_url", requireHttpsUrl(input.cancelUrl, "cancelUrl"));
    if (input.customerId) params.set("customer", input.customerId);
    else if (input.customerEmail) params.set("customer_email", input.customerEmail.trim().toLowerCase());
    if (input.clientReferenceId) params.set("client_reference_id", input.clientReferenceId);
    appendMetadata(params, input.metadata);
    return this.request<StripeCheckoutResult>("/checkout/sessions", { method: "POST", body: params.toString() });
  }

  async getSubscription(subscriptionId: string): Promise<StripeSubscriptionSummary> {
    return this.request<StripeSubscriptionSummary>(`/subscriptions/${encodeURIComponent(subscriptionId)}`);
  }

  async getPayment(paymentIntentId: string): Promise<StripePaymentSummary> {
    return this.request<StripePaymentSummary>(`/payment_intents/${encodeURIComponent(paymentIntentId)}`);
  }

  async createBillingPortalSession(input: StripeBillingPortalInput): Promise<StripeBillingPortalResult> {
    const params = new URLSearchParams();
    params.set("customer", input.customerId);
    params.set("return_url", requireHttpsUrl(input.returnUrl, "returnUrl"));
    return this.request<StripeBillingPortalResult>("/billing_portal/sessions", { method: "POST", body: params.toString() });
  }
}
