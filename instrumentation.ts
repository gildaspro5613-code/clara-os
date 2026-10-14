/** Startup has no authenticated principal or selected project. Never hydrate
 * default/global business data here; Core runtimes run in authorized requests. */
export async function register() {
  console.info("[CLARA] instrumentation ready; business runtime is request-scoped");
}
