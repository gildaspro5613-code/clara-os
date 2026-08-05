/**
 * ============================================
 * CLARA OS
 * Google Installer
 * --------------------------------------------
 * File : google-installer.ts
 * Responsibility :
 * Installs the Google connector.
 * ============================================
 */

import { Browser } from "./browser";
import { EnvironmentValidator } from "./environment-validator";
import { EnvWriter } from "./env-writer";

export class GoogleInstaller {

  private readonly validator = new EnvironmentValidator();

  private readonly browser = new Browser();

  private readonly envWriter = new EnvWriter();

  /**
   * Installs the Google connector.
   */
  public async install(): Promise<void> {

    console.log("");
    console.log("======================================");
    console.log("        CLARA OS");
    console.log(" Google Workspace Installer");
    console.log("======================================");
    console.log("");

    await this.validator.validate();

    console.log("✓ Environment");

    console.log("✓ OAuth (coming next)");

    console.log("✓ Credentials (coming next)");

    console.log("✓ Health (coming next)");

    console.log("");
    console.log("Google Installer ready.");
    console.log("");

  }

}

/**
 * CLI entry point.
 */
async function main(): Promise<void> {

  const installer = new GoogleInstaller();

  await installer.install();

}

main().catch((error) => {

  console.error(error);
  process.exit(1);

});