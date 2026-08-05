/**
 * ============================================
 * CLARA OS
 * Workspace Installer
 * --------------------------------------------
 * File : create-emails.ts
 * Responsibility :
 * Creates the default Gmail
 * configuration for a workspace.
 * ============================================
 */

import { GoogleWorkspace } from "@/lib/integrations/google/workspace";

/**
 * Creates workspace email configuration.
 */
export class CreateEmails {

  /**
   * Initializes Gmail.
   */
  public async execute(): Promise<void> {

    const gmail =
      GoogleWorkspace.gmail();

    /**
     * Verifies Gmail access.
     */
    await gmail.getProfile();

    /**
     * Future versions:
     *
     * - Create labels
     * - Create filters
     * - Create signatures
     * - Create templates
     */

  }

}