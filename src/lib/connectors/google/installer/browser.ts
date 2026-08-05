/**
 * ============================================
 * CLARA OS
 * Browser
 * --------------------------------------------
 * File : browser.ts
 * Responsibility :
 * Opens the user's default browser.
 * ============================================
 */

import { exec } from "node:child_process";

export class Browser {

  /**
   * Opens the specified URL in the default browser.
   */
  public async open(
    url: string,
  ): Promise<void> {

    const command =
      process.platform === "win32"
        ? `start "" "${url}"`
        : process.platform === "darwin"
          ? `open "${url}"`
          : `xdg-open "${url}"`;

    await new Promise<void>((resolve, reject) => {

      exec(command, (error) => {

        if (error) {

          reject(error);
          return;

        }

        resolve();

      });

    });

  }

}