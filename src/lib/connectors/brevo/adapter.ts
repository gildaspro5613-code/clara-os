import type { ConnectionResolver } from "@/lib/connections/connection-resolver";
import type { OperationalCapabilityResult } from "@/lib/capabilities/operational-result";
import { BrevoClient, type BrevoFetch } from "./client";
import { BREVO_CAPABILITIES } from "./definition";
import type {
  BrevoCampaignPreparation,
  BrevoContactSearch,
  BrevoContactUpsert,
  BrevoOAuthCredentials,
  BrevoStatisticsQuery,
  BrevoTemplateSearch,
  BrevoTransactionalEmail,
} from "./types";

export type BrevoCapabilityInput =
  | { capability: typeof BREVO_CAPABILITIES.CONTACT_SEARCH; input: BrevoContactSearch }
  | { capability: typeof BREVO_CAPABILITIES.CONTACT_UPSERT; input: BrevoContactUpsert }
  | { capability: typeof BREVO_CAPABILITIES.CONTACT_LIST_MANAGE; input: { listId: number; action: "add" | "remove"; emails?: string[]; contactIds?: number[] } }
  | { capability: typeof BREVO_CAPABILITIES.TEMPLATE_SEARCH; input: BrevoTemplateSearch }
  | { capability: typeof BREVO_CAPABILITIES.EMAIL_PREPARE; input: BrevoTransactionalEmail }
  | { capability: typeof BREVO_CAPABILITIES.EMAIL_SEND; input: BrevoTransactionalEmail }
  | { capability: typeof BREVO_CAPABILITIES.CAMPAIGN_READ; input: { campaignId?: number; limit?: number; offset?: number; status?: string } }
  | { capability: typeof BREVO_CAPABILITIES.CAMPAIGN_PREPARE; input: BrevoCampaignPreparation }
  | { capability: typeof BREVO_CAPABILITIES.CAMPAIGN_UPDATE; input: { campaignId: number; changes: Partial<BrevoCampaignPreparation> } }
  | { capability: typeof BREVO_CAPABILITIES.STATS_READ; input: BrevoStatisticsQuery };

function validateEmail(input: BrevoTransactionalEmail): BrevoTransactionalEmail {
  if (input.to.length === 0) throw new Error("At least one recipient is required.");
  if (input.templateId === undefined && !input.htmlContent && !input.textContent) {
    throw new Error("A template or email content is required.");
  }
  return input;
}

/** Native Brevo provider adapter. It never delegates Brevo operations to Make. */
export class BrevoConnectorAdapter {
  constructor(
    private readonly resolver: ConnectionResolver,
    private readonly fetcher?: BrevoFetch,
    private readonly baseUrl?: string,
  ) {}

  async execute(connectionId: string, request: BrevoCapabilityInput): Promise<OperationalCapabilityResult> {
    try {
      const { credentials } = await this.resolver.resolve<BrevoOAuthCredentials>(connectionId, "brevo");
      const client = new BrevoClient({
        accessToken: credentials.accessToken,
        fetch: this.fetcher,
        baseUrl: this.baseUrl,
      });
      let data: unknown;
      switch (request.capability) {
        case BREVO_CAPABILITIES.CONTACT_SEARCH: data = await client.searchContacts(request.input); break;
        case BREVO_CAPABILITIES.CONTACT_UPSERT: data = await client.upsertContact(request.input); break;
        case BREVO_CAPABILITIES.CONTACT_LIST_MANAGE: data = await client.manageListMembership(request.input); break;
        case BREVO_CAPABILITIES.TEMPLATE_SEARCH: data = await client.searchTemplates(request.input); break;
        case BREVO_CAPABILITIES.EMAIL_PREPARE: data = { prepared: true, email: validateEmail(request.input) }; break;
        case BREVO_CAPABILITIES.EMAIL_SEND: data = await client.sendTransactionalEmail(validateEmail(request.input)); break;
        case BREVO_CAPABILITIES.CAMPAIGN_READ:
          data = request.input.campaignId === undefined ? await client.listCampaigns(request.input) : await client.getCampaign(request.input.campaignId);
          break;
        case BREVO_CAPABILITIES.CAMPAIGN_PREPARE: data = await client.createCampaign(request.input); break;
        case BREVO_CAPABILITIES.CAMPAIGN_UPDATE: data = await client.updateCampaign(request.input.campaignId, request.input.changes); break;
        case BREVO_CAPABILITIES.STATS_READ: data = await client.readStatistics(request.input); break;
      }
      const executionId = request.capability === BREVO_CAPABILITIES.EMAIL_SEND && data && typeof data === "object" && "messageId" in data
        ? String((data as { messageId: unknown }).messageId)
        : undefined;
      return { capabilityId: request.capability, success: true, provider: "brevo", connectionId, status: "completed", ...(executionId ? { executionId } : {}), data };
    } catch (error) {
      const code = error instanceof Error && "code" in error ? String(error.code) : "BREVO_OPERATION_FAILED";
      const retryable = code === "RATE_LIMITED" || code === "SERVER_ERROR";
      return {
        capabilityId: request.capability,
        success: false,
        provider: "brevo",
        connectionId,
        status: "failed",
        error: { code, message: error instanceof Error ? error.message : "Brevo operation failed.", retryable },
      };
    }
  }
}
