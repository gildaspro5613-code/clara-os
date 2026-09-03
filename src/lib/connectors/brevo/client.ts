import { normalizeBrevoError } from "./error";
import type {
  BrevoCampaign,
  BrevoCampaignPreparation,
  BrevoContact,
  BrevoContactSearch,
  BrevoContactUpsert,
  BrevoStatisticsQuery,
  BrevoTemplate,
  BrevoTemplateSearch,
  BrevoTransactionalEmail,
} from "./types";

export type BrevoFetch = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

export interface BrevoClientOptions {
  accessToken: string;
  fetch?: BrevoFetch;
  baseUrl?: string;
}

function queryString(values: object): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (typeof value === "string" || typeof value === "number") {
      query.set(key, String(value));
    }
  }
  const result = query.toString();
  return result ? `?${result}` : "";
}

/** Focused transport adapter for the Brevo v3 operations Clara uses. */
export class BrevoClient {
  private readonly fetcher: BrevoFetch;
  private readonly baseUrl: string;

  constructor(private readonly options: BrevoClientOptions) {
    if (!options.accessToken.trim()) throw new Error("Brevo access token is required.");
    this.fetcher = options.fetch ?? fetch;
    this.baseUrl = (options.baseUrl ?? "https://api.brevo.com/v3").replace(/\/$/, "");
  }

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const response = await this.fetcher(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        accept: "application/json",
        authorization: `Bearer ${this.options.accessToken}`,
        ...(init.body ? { "content-type": "application/json" } : {}),
        ...init.headers,
      },
    });
    if (!response.ok) {
      throw await normalizeBrevoError(response, [this.options.accessToken]);
    }
    if (response.status === 204 || response.headers.get("content-length") === "0") {
      return undefined as T;
    }
    return await response.json() as T;
  }

  async searchContacts(input: BrevoContactSearch): Promise<{ contacts: BrevoContact[]; count?: number }> {
    if (input.identifier) {
      const contact = await this.getContact(input.identifier);
      return { contacts: [contact], count: 1 };
    }
    return this.request(`/contacts${queryString({
      limit: input.limit,
      offset: input.offset,
      sort: input.sort,
    })}`);
  }

  getContact(identifier: string): Promise<BrevoContact> {
    return this.request(`/contacts/${encodeURIComponent(identifier)}`);
  }

  async upsertContact(input: BrevoContactUpsert): Promise<{ contactId?: number; email: string; created: boolean }> {
    const { email, ...payload } = input;
    try {
      const existing = await this.getContact(email);
      await this.request<void>(`/contacts/${encodeURIComponent(email)}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      return { contactId: existing.id, email, created: false };
    } catch (error) {
      if (!(error instanceof Error) || !("code" in error) || error.code !== "NOT_FOUND") throw error;
      const created = await this.request<{ id?: number }>("/contacts", {
        method: "POST",
        body: JSON.stringify(input),
      });
      return { contactId: created.id, email, created: true };
    }
  }

  async manageListMembership(input: {
    listId: number;
    action: "add" | "remove";
    emails?: string[];
    contactIds?: number[];
  }): Promise<{ listId: number; action: "add" | "remove"; success: boolean }> {
    await this.request(`/contacts/lists/${input.listId}/contacts/${input.action}`, {
      method: "POST",
      body: JSON.stringify({ emails: input.emails, ids: input.contactIds }),
    });
    return { listId: input.listId, action: input.action, success: true };
  }

  async searchTemplates(input: BrevoTemplateSearch): Promise<{ templates: BrevoTemplate[]; count?: number }> {
    if (input.templateId !== undefined) {
      const template = await this.request<BrevoTemplate>(`/smtp/templates/${input.templateId}`);
      return { templates: [template], count: 1 };
    }
    return this.request(`/smtp/templates${queryString({
      limit: input.limit,
      offset: input.offset,
      sort: input.sort,
    })}`);
  }

  async sendTransactionalEmail(input: BrevoTransactionalEmail): Promise<{ messageId: string }> {
    return this.request("/smtp/email", { method: "POST", body: JSON.stringify(input) });
  }

  listCampaigns(input: { limit?: number; offset?: number; status?: string } = {}): Promise<{ campaigns: BrevoCampaign[]; count?: number }> {
    return this.request(`/emailCampaigns${queryString(input)}`);
  }

  getCampaign(campaignId: number): Promise<BrevoCampaign> {
    return this.request(`/emailCampaigns/${campaignId}`);
  }

  createCampaign(input: BrevoCampaignPreparation): Promise<{ id: number }> {
    return this.request("/emailCampaigns", { method: "POST", body: JSON.stringify(input) });
  }

  async updateCampaign(campaignId: number, input: Partial<BrevoCampaignPreparation>): Promise<{ campaignId: number; updated: true }> {
    await this.request<void>(`/emailCampaigns/${campaignId}`, {
      method: "PUT",
      body: JSON.stringify(input),
    });
    return { campaignId, updated: true };
  }

  readStatistics(input: BrevoStatisticsQuery): Promise<Record<string, unknown>> {
    if (input.campaignId !== undefined) {
      return this.request(`/emailCampaigns/${input.campaignId}`);
    }
    return this.request(`/smtp/statistics/events${queryString(input)}`);
  }
}
