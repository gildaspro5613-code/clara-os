/**
 * ============================================
 * CLARA OS
 * Workspace Install Capability
 * --------------------------------------------
 * File : workflow.ts
 * Responsibility :
 * Executes the Workspace
 * installation workflow.
 * ============================================
 */

import { BusinessFactory } from "@/business/business-factory";
import { WorkspaceInstaller } from "@/onboarding/services/workspace-installer";

import { WorkspaceInstallContext } from "./context";
import { WorkspaceInstallResult } from "./result";

/**
 * Workspace Install workflow.
 */
export class WorkspaceInstallWorkflow {

  /**
   * Business engine.
   */
  private readonly business =
    BusinessFactory.create();

  /**
   * Workspace installer.
   */
  private readonly installer =
    new WorkspaceInstaller();

  /**
   * Executes the workflow.
   */
  public async execute(
    context: WorkspaceInstallContext,
  ): Promise<WorkspaceInstallResult> {

    const application =
      this.business.getApplication(
        "clara-essentials",
      );

    if (!application) {

      return {

        success: false,

        message: "Application not found.",

        companyFolderId: "",

        spreadsheets: [],

        completedAt: new Date(),

      };

    }

    const installation =
      await this.installer.install(
        application,
      );

    return {

      success: installation.success,

      message: installation.message,

      companyFolderId:
        installation.companyFolderId,

      spreadsheets:
        installation.spreadsheets,

      completedAt:
        installation.completedAt,

    };

  }

}