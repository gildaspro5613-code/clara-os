/**
 * ============================================
 * CLARA OS
 * Installation Module
 * --------------------------------------------
 * File : installation-engine.ts
 * Responsibility :
 * Executes installation workflows.
 * ============================================
 */

import { Installer } from "./installer";
import { InstallationContext } from "./installation-context";
import { InstallationResult } from "./installation-result";

/**
 * Installation engine.
 */
export interface InstallationEngine {

  /**
   * Executes an installer.
   */
  execute(
    installer: Installer,
    context: InstallationContext,
  ): Promise<InstallationResult>;

}