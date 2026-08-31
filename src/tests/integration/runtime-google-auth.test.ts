import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

async function main() {

  console.log("\n=== GOOGLE OAUTH REAL TEST ===");

  const {
    GoogleAuth,
  } = await import(
    "@/lib/connectors/internal/google/auth/google-auth"
  );

  try {

    const client =
      await new GoogleAuth().createClient();

    console.log(
      "GoogleAuth → configuration chargée",
    );

    console.log(
      "Tentative d'authentification Google...",
    );

    await client.getAccessToken();

    console.log(
      "\n=== GOOGLE OAUTH RÉUSSI ===",
    );

  } catch (error) {

    console.error(
      "\n=== GOOGLE OAUTH EN ERREUR ===",
    );

    console.error(error);

    process.exit(1);

  }

}

main();
