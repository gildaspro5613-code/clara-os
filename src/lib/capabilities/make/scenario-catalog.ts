const MAKE_SCENARIO_SCOPE_PREFIX = "make:scenario:";

/**
 * Returns the Make scenario keys explicitly allowed by the workspace connection.
 * Make V2 is fail-closed: a scenario must always have an explicit workspace scope.
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
  return getAllowedMakeScenarioKeys(scopes).has(scenarioKey.trim());
}
