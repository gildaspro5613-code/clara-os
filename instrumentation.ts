/** Startup has no authenticated principal or selected project. Never hydrate
 * default/global business data here; Core runtimes run in authorized requests. */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { installRecetteTransport } = await import('./src/lib/recette/transport');
    try { installRecetteTransport(); }
    catch (error) {
      const { reportRecetteStartupFailure } = await import('./src/lib/recette/diagnostics');
      reportRecetteStartupFailure(error);
      throw error;
    }
  }
  console.info("[CLARA] instrumentation ready; business runtime is request-scoped");
}
