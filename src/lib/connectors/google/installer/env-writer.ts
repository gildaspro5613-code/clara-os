/**
 * ============================================
 * CLARA OS
 * Google Environment Writer
 * --------------------------------------------
 * File : env-writer.ts
 * Responsibility :
 * Writes Google credentials into
 * the local .env.local file.
 * ============================================
 */

import fs from "node:fs";
import path from "node:path";

export class EnvWriter {

  /**
   * Saves the Google Refresh Token.
   */
  public async writeRefreshToken(
    refreshToken: string,
  ): Promise<void> {

    const envPath = path.resolve(process.cwd(), ".env.local");

    let content = "";

    if (fs.existsSync(envPath)) {

      content = fs.readFileSync(
        envPath,
        "utf8",
      );

    }

    if (content.includes("GOOGLE_REFRESH_TOKEN=")) {

      content = content.replace(
        /^GOOGLE_REFRESH_TOKEN=.*$/m,
        `GOOGLE_REFRESH_TOKEN=${refreshToken}`,
      );

    } else {

      if (content.length > 0 && !content.endsWith("\n")) {

        content += "\n";

      }

      content += `GOOGLE_REFRESH_TOKEN=${refreshToken}\n`;

    }

    fs.writeFileSync(
      envPath,
      content,
      "utf8",
    );

  }

}