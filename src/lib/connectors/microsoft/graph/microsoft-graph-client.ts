const MICROSOFT_GRAPH_BASE_URL = "https://graph.microsoft.com/v1.0";

export interface MicrosoftCloudPc {
  id: string;
  displayName?: string;
  managedDeviceName?: string;
  status?: string;
  userPrincipalName?: string;
}

export class MicrosoftGraphClient {
  constructor(private readonly accessToken: string) {}

  private async request<T>(path: string): Promise<T> {
    const response = await fetch(`${MICROSOFT_GRAPH_BASE_URL}${path}`, {
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        Accept: "application/json",
      },
      cache: "no-store",
    });

    const data = (await response.json()) as T & {
      error?: { message?: string };
    };

    if (!response.ok) {
      throw new Error(data.error?.message ?? "Microsoft Graph request failed.");
    }

    return data;
  }

  getCurrentUser() {
    return this.request<{ id: string; displayName?: string; userPrincipalName?: string }>(
      "/me?$select=id,displayName,userPrincipalName",
    );
  }

  async listCloudPcs(): Promise<MicrosoftCloudPc[]> {
    const data = await this.request<{ value?: MicrosoftCloudPc[] }>(
      "/me/cloudPCs?$select=id,displayName,managedDeviceName,status,userPrincipalName",
    );
    return data.value ?? [];
  }
}
