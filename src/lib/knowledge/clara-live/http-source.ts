import {
  ClaraLiveKnowledgeQuery,
  ClaraLiveKnowledgeReference,
  ClaraLiveKnowledgeSource,
} from "./source";

export interface ClaraLiveHttpSourceOptions {
  baseUrl: string;
  token?: string;
  fetcher?: typeof fetch;
}

/**
 * Transport adapter for the Clara Live Knowledge Bridge.
 *
 * The Knowledge Engine only sees ClaraLiveKnowledgeSource. HTTP details stay
 * here so the Brain and Runtime remain independent from Clara Live transport.
 */
export class ClaraLiveHttpKnowledgeSource implements ClaraLiveKnowledgeSource {
  public readonly id = "clara-live-http";

  private readonly baseUrl: string;
  private readonly token?: string;
  private readonly fetcher: typeof fetch;

  public constructor(options: ClaraLiveHttpSourceOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, "");
    this.token = options.token;
    this.fetcher = options.fetcher ?? fetch;
  }

  public async search(
    query: ClaraLiveKnowledgeQuery,
  ): Promise<readonly ClaraLiveKnowledgeReference[]> {
    const url = new URL(`${this.baseUrl}/api/knowledge/materials`);

    if (query.domain) url.searchParams.set("domain", query.domain);
    if (query.search?.trim()) url.searchParams.set("search", query.search.trim());
    if (query.limit !== undefined) url.searchParams.set("limit", String(query.limit));

    const response = await this.fetcher(url, {
      method: "GET",
      headers: this.token
        ? { Authorization: `Bearer ${this.token}`, Accept: "application/json" }
        : { Accept: "application/json" },
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Clara Live Knowledge request failed with status ${response.status}`);
    }

    const payload: unknown = await response.json();
    if (!Array.isArray(payload)) {
      throw new Error("Clara Live Knowledge response must be an array");
    }

    return payload as ClaraLiveKnowledgeReference[];
  }
}
