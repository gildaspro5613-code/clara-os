/**
 * CLARA OS — Clara Live Knowledge Source
 *
 * Defines the boundary between Clara OS knowledge and a Clara Live
 * domain source. Storage and transport remain outside the Knowledge Engine.
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
