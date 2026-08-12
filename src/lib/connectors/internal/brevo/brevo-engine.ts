/**
 * ============================================
 * CLARA OS
 * Brevo Connector
 * --------------------------------------------
 * File : brevo-engine.ts
 * Responsibility :
 * Executes real Brevo API operations.
 * ============================================
 */

import { brevoConfig } from "@/lib/config/brevo";
import type { BrevoContext } from "./brevo-context";
import type {
  BrevoContact,
  BrevoCampaign,
  BrevoResult,
} from "./brevo-result";

/**
 * Brevo REST API base URL.
 */
const BREVO_API_BASE = "https://api.brevo.com/v3";

/**
 * Engine that coordinates Brevo API operations.
 */
export class BrevoEngine {

  /**
   * Sends an authenticated request to the Brevo API.
   */
  private async request<T>(
    path: string,
    options?: RequestInit,
  ): Promise<T> {

    const response = await fetch(
      `${BREVO_API_BASE}${path}`,
      {
        ...options,
        headers: {
          "api-key": brevoConfig.apiKey,
          "Content-Type": "application/json",
          "Accept": "application/json",
          ...(options?.headers ?? {}),
        },
      },
    );

    if (!response.ok) {

      const text = await response.text();

      throw new Error(
        `Brevo API error ${response.status}: ${text}`,
      );

    }

    if (
      response.status === 204 ||
      response.headers.get("content-length") === "0"
    ) {
      return undefined as unknown as T;
    }

    return response.json() as Promise<T>;

  }

  /**
   * Lists contacts from Brevo.
   */
  public async listContacts(
    context: BrevoContext,
  ): Promise<BrevoResult> {

    try {

      const limit = context.limit ?? 50;
      const offset = context.offset ?? 0;

      const data = await this.request<{
        contacts: Array<{
          id?: number;
          email: string;
          firstName?: string;
          lastName?: string;
          attributes?: Record<string, unknown>;
          listIds?: number[];
          createdAt?: string;
          modifiedAt?: string;
        }>;
      }>(`/contacts?limit=${limit}&offset=${offset}`);

      const contacts: BrevoContact[] = data.contacts.map(
        (c) => ({
          id: c.id,
          email: c.email,
          firstName:
            c.firstName
            ?? (c.attributes?.["FIRSTNAME"] as string | undefined),
          lastName:
            c.lastName
            ?? (c.attributes?.["LASTNAME"] as string | undefined),
          attributes: c.attributes,
          listIds: c.listIds,
          createdAt: c.createdAt,
          modifiedAt: c.modifiedAt,
        }),
      );

      return {
        success: true,
        operation: "list-contacts",
        contacts,
        message: `${contacts.length} contact(s) retrieved.`,
        completedAt: new Date(),
      };

    } catch (error) {

      return {
        success: false,
        operation: "list-contacts",
        error:
          error instanceof Error
            ? error.message
            : "Unknown Brevo error.",
        completedAt: new Date(),
      };

    }

  }

  /**
   * Retrieves a single contact by email.
   */
  public async getContact(
    context: BrevoContext,
  ): Promise<BrevoResult> {

    if (!context.email) {
      return {
        success: false,
        operation: "get-contact",
        error: "email is required for get-contact.",
        completedAt: new Date(),
      };
    }

    try {

      const data = await this.request<{
        id?: number;
        email: string;
        attributes?: Record<string, unknown>;
        listIds?: number[];
        statistics?: {
          messagesSent?: Array<unknown>;
          hardBounces?: Array<unknown>;
          softBounces?: Array<unknown>;
          unsubscriptions?: Array<unknown>;
          opens?: { count?: number };
          clicks?: { count?: number };
        };
        createdAt?: string;
        modifiedAt?: string;
      }>(`/contacts/${encodeURIComponent(context.email)}`);

      const contact: BrevoContact = {
        id: data.id,
        email: data.email,
        firstName:
          data.attributes?.["FIRSTNAME"] as string | undefined,
        lastName:
          data.attributes?.["LASTNAME"] as string | undefined,
        attributes: data.attributes,
        listIds: data.listIds,
        statistics: {
          messagesSent: data.statistics?.messagesSent?.length,
          hardBounces: data.statistics?.hardBounces?.length,
          softBounces: data.statistics?.softBounces?.length,
          unsubscriptions: data.statistics?.unsubscriptions?.length,
          opens: data.statistics?.opens?.count,
          clicks: data.statistics?.clicks?.count,
        },
        createdAt: data.createdAt,
        modifiedAt: data.modifiedAt,
      };

      return {
        success: true,
        operation: "get-contact",
        contact,
        message: `Contact ${contact.email} retrieved.`,
        completedAt: new Date(),
      };

    } catch (error) {

      return {
        success: false,
        operation: "get-contact",
        error:
          error instanceof Error
            ? error.message
            : "Unknown Brevo error.",
        completedAt: new Date(),
      };

    }

  }

  /**
   * Creates a new contact in Brevo.
   */
  public async createContact(
    context: BrevoContext,
  ): Promise<BrevoResult> {

    if (!context.email) {
      return {
        success: false,
        operation: "create-contact",
        error: "email is required for create-contact.",
        completedAt: new Date(),
      };
    }

    try {

      const attributes: Record<string, unknown> = {
        ...(context.attributes ?? {}),
      };

      if (context.firstName) {
        attributes["FIRSTNAME"] = context.firstName;
      }

      if (context.lastName) {
        attributes["LASTNAME"] = context.lastName;
      }

      await this.request<{ id: number }>(
        "/contacts",
        {
          method: "POST",
          body: JSON.stringify({
            email: context.email,
            attributes,
            listIds: context.listIds,
          }),
        },
      );

      return {
        success: true,
        operation: "create-contact",
        message: `Contact ${context.email} created.`,
        completedAt: new Date(),
      };

    } catch (error) {

      return {
        success: false,
        operation: "create-contact",
        error:
          error instanceof Error
            ? error.message
            : "Unknown Brevo error.",
        completedAt: new Date(),
      };

    }

  }

  /**
   * Updates an existing contact in Brevo.
   */
  public async updateContact(
    context: BrevoContext,
  ): Promise<BrevoResult> {

    if (!context.email) {
      return {
        success: false,
        operation: "update-contact",
        error: "email is required for update-contact.",
        completedAt: new Date(),
      };
    }

    try {

      const attributes: Record<string, unknown> = {
        ...(context.attributes ?? {}),
      };

      if (context.firstName) {
        attributes["FIRSTNAME"] = context.firstName;
      }

      if (context.lastName) {
        attributes["LASTNAME"] = context.lastName;
      }

      await this.request<void>(
        `/contacts/${encodeURIComponent(context.email)}`,
        {
          method: "PUT",
          body: JSON.stringify({
            attributes,
            listIds: context.listIds,
          }),
        },
      );

      return {
        success: true,
        operation: "update-contact",
        message: `Contact ${context.email} updated.`,
        completedAt: new Date(),
      };

    } catch (error) {

      return {
        success: false,
        operation: "update-contact",
        error:
          error instanceof Error
            ? error.message
            : "Unknown Brevo error.",
        completedAt: new Date(),
      };

    }

  }

  /**
   * Lists email campaigns from Brevo.
   */
  public async listCampaigns(
    context: BrevoContext,
  ): Promise<BrevoResult> {

    try {

      const limit = context.limit ?? 50;
      const offset = context.offset ?? 0;

      const data = await this.request<{
        campaigns: Array<{
          id: number;
          name: string;
          subject?: string;
          status: string;
          sentDate?: string;
          statistics?: Record<string, unknown>;
        }>;
      }>(
        `/emailCampaigns?limit=${limit}&offset=${offset}&type=classic`,
      );

      const campaigns: BrevoCampaign[] = data.campaigns.map(
        (c) => ({
          id: c.id,
          name: c.name,
          subject: c.subject,
          status: c.status,
          sentDate: c.sentDate,
          statistics: c.statistics,
        }),
      );

      return {
        success: true,
        operation: "list-campaigns",
        campaigns,
        message: `${campaigns.length} campaign(s) retrieved.`,
        completedAt: new Date(),
      };

    } catch (error) {

      return {
        success: false,
        operation: "list-campaigns",
        error:
          error instanceof Error
            ? error.message
            : "Unknown Brevo error.",
        completedAt: new Date(),
      };

    }

  }

  /**
   * Sends a transactional email via Brevo.
   */
  public async sendEmail(
    context: BrevoContext,
  ): Promise<BrevoResult> {

    if (!context.to || !context.subject) {
      return {
        success: false,
        operation: "send-email",
        error: "to and subject are required for send-email.",
        completedAt: new Date(),
      };
    }

    if (!context.htmlBody && !context.textBody) {
      return {
        success: false,
        operation: "send-email",
        error: "htmlBody or textBody is required for send-email.",
        completedAt: new Date(),
      };
    }

    try {

      const data = await this.request<{ messageId: string }>(
        "/smtp/email",
        {
          method: "POST",
          body: JSON.stringify({
            sender: {
              name: context.senderName ?? brevoConfig.senderName,
              email: context.senderEmail ?? brevoConfig.senderEmail,
            },
            to: [{ email: context.to }],
            subject: context.subject,
            htmlContent: context.htmlBody,
            textContent: context.textBody,
          }),
        },
      );

      return {
        success: true,
        operation: "send-email",
        messageId: data.messageId,
        message: `Email sent to ${context.to}.`,
        completedAt: new Date(),
      };

    } catch (error) {

      return {
        success: false,
        operation: "send-email",
        error:
          error instanceof Error
            ? error.message
            : "Unknown Brevo error.",
        completedAt: new Date(),
      };

    }

  }

  /**
   * Executes a Brevo operation from its context.
   */
  public async execute(
    context: BrevoContext,
  ): Promise<BrevoResult> {

    switch (context.operation) {

      case "list-contacts":
        return this.listContacts(context);

      case "get-contact":
        return this.getContact(context);

      case "create-contact":
        return this.createContact(context);

      case "update-contact":
        return this.updateContact(context);

      case "list-campaigns":
        return this.listCampaigns(context);

      case "send-email":
        return this.sendEmail(context);

      default: {
        const exhaustive: never = context.operation;
        return {
          success: false,
          operation: exhaustive,
          error: `Unknown Brevo operation: ${exhaustive}.`,
          completedAt: new Date(),
        };
      }

    }

  }

}
