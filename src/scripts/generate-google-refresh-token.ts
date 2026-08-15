import { loadEnvConfig } from "@next/env";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

loadEnvConfig(process.cwd());

const SCOPES = [
  "https://www.googleapis.com/auth/gmail.modify",
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/drive",
  "https://www.googleapis.com/auth/documents",
  "https://www.googleapis.com/auth/spreadsheets",
];

async function main() {
  const {
    GoogleOAuthClient,
    GoogleOAuthServer,
    GoogleOAuthToken,
  } = await import("../lib/connectors/google/oauth/module");

  const oauthClient = new GoogleOAuthClient();
  const client = oauthClient.getClient();

  const authorizationUrl = client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: SCOPES,
  });

  console.log("");
  console.log("============================================");
  console.log(" CLARA OS — GOOGLE AUTHENTICATION");
  console.log("============================================");
  console.log("");
  console.log("Ouvre cette URL dans ton navigateur :");
  console.log("");
  console.log(authorizationUrl);
  console.log("");
  console.log("Autorise Clara OS avec le compte Google concerné.");
  console.log("Le navigateur reviendra ensuite sur le callback local.");
  console.log("");

  const server = new GoogleOAuthServer();
  const authorizationCode = await server.listenForCode(180_000);

  const tokenService = new GoogleOAuthToken(client);
  const refreshToken = await tokenService.exchange(authorizationCode);

  const envPath = ".env.local";
  const current = existsSync(envPath)
    ? readFileSync(envPath, "utf8")
    : "";

  const line = `GOOGLE_REFRESH_TOKEN=${refreshToken}`;

  const updated = current.match(/^GOOGLE_REFRESH_TOKEN=.*$/m)
    ? current.replace(/^GOOGLE_REFRESH_TOKEN=.*$/m, line)
    : `${current.trimEnd()}\n${line}\n`;

  writeFileSync(envPath, updated, "utf8");

  console.log("");
  console.log("============================================");
  console.log(" ✅ GOOGLE REFRESH TOKEN ENREGISTRÉ");
  console.log("============================================");
  console.log("");
  console.log("Le token a été écrit dans .env.local.");
  console.log("Il n'est pas affiché dans le terminal.");
  console.log("");
}

main().catch((error) => {
  console.error("");
  console.error("❌ GOOGLE OAUTH FAILED");
  console.error(
    error instanceof Error ? error.message : error,
  );
  process.exit(1);
});
