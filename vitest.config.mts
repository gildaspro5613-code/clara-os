import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

// Existing Vitest suites coexist with the node:test suites under src/tests.
export default defineConfig({
  resolve: { alias: { "@": resolve(process.cwd(), "src") } },
  test: {
    environment: "node",
    include: ["src/lib/acquisition/*.test.ts", "src/lib/brain/acquisition-event.test.ts", "src/app/api/external/events/route.test.ts", "src/app/api/external/project-intake/route.test.ts"],
  },
});
