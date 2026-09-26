/**
 * Clara Live remains the source of truth for professional equipment knowledge.
 * This contract exposes references to Clara OS without copying the catalogue.
 */
export type ClaraLiveDomain = "lighting" | "sound" | "video" | "production";

export interface ClaraLiveKnowledgeReference {
  id: string;
  domain: ClaraLiveDomain;
  type: string;
  manufacturer?: string;
  model: string;
  verified: boolean;
  aliases: readonly string[];
  metadata: Readonly<Record<string, unknown>>;
}

export interface ClaraLiveKnowledgeQuery {
  domain?: ClaraLiveDomain;
  search?: string;
  limit?: number;
}

export interface ClaraLiveKnowledgeSource {
  readonly id: string;
  search(query: ClaraLiveKnowledgeQuery): Promise<readonly ClaraLiveKnowledgeReference[]>;
}
