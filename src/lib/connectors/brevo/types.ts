export interface BrevoOAuthCredentials {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
  tokenType?: "Bearer";
}

export interface BrevoContact {
  id: number;
  email: string;
  attributes?: Record<string, unknown>;
  listIds?: number[];
  emailBlacklisted?: boolean;
}

export interface BrevoContactSearch {
  identifier?: string;
  limit?: number;
  offset?: number;
  sort?: "asc" | "desc";
}

export interface BrevoContactUpsert {
  email: string;
  attributes?: Record<string, string | number | boolean | null>;
  listIds?: number[];
  unlinkListIds?: number[];
  emailBlacklisted?: boolean;
}

export interface BrevoTemplate {
  id: number;
  name: string;
  subject?: string;
  isActive?: boolean;
}

export interface BrevoTemplateSearch {
  templateId?: number;
  limit?: number;
  offset?: number;
  sort?: "asc" | "desc";
}

export interface BrevoEmailAddress {
  email: string;
  name?: string;
}

export interface BrevoTransactionalEmail {
  to: BrevoEmailAddress[];
  templateId?: number;
  params?: Record<string, unknown>;
  subject?: string;
  htmlContent?: string;
  textContent?: string;
  sender?: BrevoEmailAddress;
  replyTo?: BrevoEmailAddress;
  tags?: string[];
}

export interface BrevoCampaign {
  id: number;
  name: string;
  status?: string;
  subject?: string;
  scheduledAt?: string;
}

export interface BrevoCampaignPreparation {
  name: string;
  subject: string;
  sender: BrevoEmailAddress;
  recipients: { listIds?: number[]; exclusionListIds?: number[] };
  templateId?: number;
  htmlContent?: string;
  scheduledAt?: string;
}

export interface BrevoStatisticsQuery {
  campaignId?: number;
  event?: "sent" | "delivered" | "opened" | "clicks" | "hardBounces" | "softBounces" | "blocked" | "unsubscribed";
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}
