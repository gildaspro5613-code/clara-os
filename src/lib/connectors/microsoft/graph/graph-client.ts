/**
 * ============================================
 * CLARA OS
 * Microsoft Graph Client
 * --------------------------------------------
 * Responsibility :
 * Provides a minimal authenticated HTTP client
 * for Microsoft Graph without coupling Brain
 * or Runtime to Microsoft-specific details.
 * ============================================
 */

const DEFAULT_GRAPH_BASE_URL = "https://graph.microsoft.com/v1.0";

export interface MicrosoftGraphClientOptions {
  accessToken?: string;
  baseUrl?: string;
}

export class MicrosoftGraphClient {
  private readonly accessToken: string;
  private readonly baseUrl: string;

  public constructor(options: MicrosoftGraphClientOptions = {}) {
    const accessToken =
      options.accessToken ?? process.env.MICROSOFT_GRAPH_ACCESS_TOKEN;

    if (!accessToken) {
      throw new Error(
        "MicrosoftGraphClient: MICROSOFT_GRAPH_ACCESS_TOKEN is not configured.",
      );
    }

    this.accessToken = accessToken;
    this.baseUrl = options.baseUrl ?? DEFAULT_GRAPH_BASE_URL;
  }

  public async request<T>(
    path: string,
    init: RequestInit = {},
  ): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        "Content-Type": "application/json",
        ...(init.headers ?? {}),
      },
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(
        `Microsoft Graph request failed (${response.status}): ${detail}`,
      );
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return (await response.json()) as T;
  }
}
