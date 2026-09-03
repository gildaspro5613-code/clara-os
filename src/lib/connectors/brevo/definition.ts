import type { ConnectorDefinition, ConnectorOperationType } from "../core/connector";

export const BREVO_CAPABILITIES = {
  CONTACT_SEARCH: "brevo.contact.search",
  CONTACT_UPSERT: "brevo.contact.upsert",
  CONTACT_LIST_MANAGE: "brevo.contact.list.manage",
  TEMPLATE_SEARCH: "brevo.template.search",
  EMAIL_PREPARE: "brevo.email.prepare",
  EMAIL_SEND: "brevo.email.send",
  CAMPAIGN_READ: "brevo.campaign.read",
  CAMPAIGN_PREPARE: "brevo.campaign.prepare",
  CAMPAIGN_UPDATE: "brevo.campaign.update",
  STATS_READ: "brevo.stats.read",
} as const;

const capability = (
  id: string,
  operationType: ConnectorOperationType,
  description: string,
) => ({ id, operationType, description });

export const BrevoConnectorDefinition: ConnectorDefinition = {
  id: "brevo",
  name: "Brevo",
  version: "1.0.0",
  authentication: { type: "oauth2", credentialReference: "connectionId" },
  capabilities: [
    capability(BREVO_CAPABILITIES.CONTACT_SEARCH, "READ", "Search Brevo contacts."),
    capability(BREVO_CAPABILITIES.CONTACT_UPSERT, "WRITE", "Create or update a Brevo contact."),
    capability(BREVO_CAPABILITIES.CONTACT_LIST_MANAGE, "WRITE", "Manage Brevo contact list membership."),
    capability(BREVO_CAPABILITIES.TEMPLATE_SEARCH, "READ", "Search Brevo email templates."),
    capability(BREVO_CAPABILITIES.EMAIL_PREPARE, "PREPARE", "Prepare a typed transactional email request."),
    capability(BREVO_CAPABILITIES.EMAIL_SEND, "EXECUTE", "Send a transactional email through Brevo."),
    capability(BREVO_CAPABILITIES.CAMPAIGN_READ, "READ", "Read Brevo email campaigns."),
    capability(BREVO_CAPABILITIES.CAMPAIGN_PREPARE, "WRITE", "Prepare a typed Brevo campaign request."),
    capability(BREVO_CAPABILITIES.CAMPAIGN_UPDATE, "WRITE", "Update a Brevo email campaign."),
    capability(BREVO_CAPABILITIES.STATS_READ, "READ", "Read Brevo email or campaign statistics."),
  ],
};
