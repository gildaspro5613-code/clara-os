/** Defence in depth for the dedicated Recette Vercel project. Not a network firewall.
 * Production is unchanged outside the explicit Recette mode and project identity.
 */
const RECETTE_VERCEL_PROJECT_ID = "prj_lgt74rXSoT2jPHDkC1Yw1y2TWdxz";

export function isRecetteRuntime(): boolean {
  return process.env.CLARA_OS_RUNTIME_MODE === "recette"
    || process.env.VERCEL_PROJECT_ID === RECETTE_VERCEL_PROJECT_ID;
}

export function assertRecetteExternalExecutionBlocked(operation: string): void {
  if (isRecetteRuntime()) {
    throw new Error(`RECETTE_EXTERNAL_EXECUTION_DENIED:${operation}`);
  }
}
