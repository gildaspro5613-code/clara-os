/** Server-side, fail-closed guard for the isolated Clara OS Recette deployment.
 * This is a defence-in-depth gate for wired execution paths, not a network firewall.
 * Production behaviour is unchanged unless CLARA_OS_RUNTIME_MODE=recette.
 */
export function assertRecetteExternalExecutionBlocked(operation: string): void {
  if (process.env.CLARA_OS_RUNTIME_MODE === "recette") {
    throw new Error(`RECETTE_EXTERNAL_EXECUTION_DENIED:${operation}`);
  }
}
