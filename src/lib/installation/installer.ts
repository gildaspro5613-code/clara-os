/**
 * ============================================
 * CLARA OS
 * Installation Module
 * --------------------------------------------
 * File : installer.ts
 * Responsibility :
 * Defines the common installation contract
 * implemented by every installer.
 * ============================================
 */

import { InstallationContext } from "./installation-context";
import { InstallationResult } from "./installation-result";

/**
 * Generic installer.
 */
export interface Installer {

  /**
   * Installer identifier.
   */
  readonly id: string;

  /**
   * Installer name.
   */
  readonly name: string;

  /**
   * Executes installation.
   */
  install(
    context: InstallationContext,
  ): Promise<InstallationResult>;

  /**
   * Validates installation.
   */
  validate(
    context: InstallationContext,
  ): Promise<boolean>;

  /**
   * Removes installation.
   */
  uninstall(
    context: InstallationContext,
  ): Promise<void>;

}