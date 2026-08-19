import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

if (!process.env.GOOGLE_CLIENT_ID) {
  throw new Error("GOOGLE_CLIENT_ID is not loaded.");
}

if (!process.env.GOOGLE_CLIENT_SECRET) {
  throw new Error("GOOGLE_CLIENT_SECRET is not loaded.");
}

if (!process.env.GOOGLE_REFRESH_TOKEN) {
  throw new Error("GOOGLE_REFRESH_TOKEN is not loaded.");
}

console.log("Google environment loaded.");
