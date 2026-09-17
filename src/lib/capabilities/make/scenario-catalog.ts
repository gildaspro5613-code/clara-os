const MAKE_SCENARIO_SCOPE_PREFIX = "make:scenario:";

/**
 * Returns the Make scenario keys explicitly allowed by the workspace connection.
 * When no Make scenario scopes are present, the credential-backed scenario map
 * remains the compatibility authorization boundary.
 */
export function getAllowedMakeScenarioKeys(scopes: readonly string[]): ReadonlySet<string> {
  const keys = scopes
    .filter((scope) => scope.startsWith(MAKE_SCENARIO_SCOPE_PREFIX))
    .map((scope) => scope.slice(MAKE_SCENARIO_SCOPE_PREFIX.length).trim())
    .filter(Boolean);

  return new Set(keys);
}

export function isMakeScenarioAllowed(
  scopes: readonly string[],
  scenarioKey: string,
): boolean {
  const allowed = getAllowedMakeScenarioKeys(scopes);
  return allowed.size === 0 || allowed.has(scenarioKey.trim());
}
