export async function register() {
  console.log("[CLARA] instrumentation.register()");
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startRuntime } = await import("./src/lib/core/runtime");
    await startRuntime();
  }
}
