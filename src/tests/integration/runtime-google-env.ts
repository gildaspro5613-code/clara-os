import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

console.log("\n=== GOOGLE ENV LOADED ===");
console.log("GOOGLE_CLIENT_ID     :", Boolean(process.env.GOOGLE_CLIENT_ID));
console.log("GOOGLE_CLIENT_SECRET :", Boolean(process.env.GOOGLE_CLIENT_SECRET));
console.log("GOOGLE_REDIRECT_URI  :", Boolean(process.env.GOOGLE_REDIRECT_URI));
console.log("GOOGLE_REFRESH_TOKEN :", Boolean(process.env.GOOGLE_REFRESH_TOKEN));

if (
  !process.env.GOOGLE_CLIENT_ID ||
  !process.env.GOOGLE_CLIENT_SECRET ||
  !process.env.GOOGLE_REDIRECT_URI ||
  !process.env.GOOGLE_REFRESH_TOKEN
) {
  throw new Error(
    "Une ou plusieurs variables Google sont absentes après chargement de .env.local.",
  );
}

console.log("\n=== TEST ENV RÉUSSI ===");
