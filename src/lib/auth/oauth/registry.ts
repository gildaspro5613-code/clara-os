import type { OAuthProviderDefinition } from "./types";
import { OAuthError } from "./error";

export class OAuthProviderRegistry {
  private readonly providers: ReadonlyMap<string, OAuthProviderDefinition>;

  constructor(providers: readonly OAuthProviderDefinition[]) {
    this.providers = new Map(providers.map((provider) => [provider.id, provider]));
  }

  get(providerId: string): OAuthProviderDefinition {
    const provider = this.providers.get(providerId);
    if (!provider) throw new OAuthError("UNSUPPORTED_PROVIDER");
    return provider;
  }
}
