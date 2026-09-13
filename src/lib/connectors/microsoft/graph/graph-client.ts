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

import { getMicrosoftRuntimeTokenContext } from "../../internal/microsoft/auth/microsoft-runtime-token-context";

const DEFAULT_GRAPH_BASE_URL = "https://graph.microsoft.com/v1.0";

export interface MicrosoftGraphClientOptions {
  accessToken?: string;
  baseUrl?: string;
}

export class MicrosoftGraphClient {
  private readonly accessToken: string;
  private readonly baseUrl: string;

  public constructor(options: MicrosoftGraphClientOptions = {}) {
    const runtimeToken = getMicrosoftRuntimeTokenContext()?.accessToken;
    const accessToken =
      options.accessToken ??
      runtimeToken ??
      process.env.MICROSOFT_GRAPH_ACCESS_TOKEN;

    if (!accessToken) {
      throw new Error(
        "MicrosoftGraphClient: no Microsoft Graph access token is available.",
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
