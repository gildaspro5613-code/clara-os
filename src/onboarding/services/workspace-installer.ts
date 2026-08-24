/**
 * ============================================
 * CLARA OS
 * Workspace Installer
 * --------------------------------------------
 * Responsibility :
 * Installs one Clara application.
 * ============================================
 */

import { Application } from "@/business/models/application";

import { WorkspaceInstallationResult } from "../models/workspace-installation-result";
import { saveWorkspace } from "@/lib/core/workspace/workspace-store";

import { CreateCalendar } from "./workspace/create-calendar";
import { CreateCompanyFolder } from "./workspace/create-company-folder";
import { CreateDocuments } from "./workspace/create-documents";
import { CreateEmails } from "./workspace/create-emails";
import { CreateFolders } from "./workspace/create-folders";
import { CreateSheets } from "./workspace/create-sheets";

export class WorkspaceInstaller {

  private readonly companyFolder =
    new CreateCompanyFolder();

  private readonly folders =
    new CreateFolders();

  private readonly documents =
    new CreateDocuments();

  private readonly sheets =
    new CreateSheets();

  private readonly calendar =
    new CreateCalendar();

  private readonly emails =
    new CreateEmails();

  public async install(
    application: Application,
  ): Promise<WorkspaceInstallationResult> {

    const steps = [];

    const companyFolderId =
      await this.companyFolder.execute(
        application.branding.companyName,
      );

    steps.push({

      name: "Create company folder",

      success: true,

    });

    const folders =
      await this.folders.execute(
        companyFolderId,
      );

    steps.push({

      name: "Create folders",

      success: true,

    });

    const documents =
      await this.documents.execute(
        application.branding.companyName,
      );

    steps.push({

      name: "Create documents",

      success: true,

    });

    const spreadsheets =
      await this.sheets.execute(
        application.branding.companyName,
      );

    steps.push({

      name: "Create spreadsheets",

      success: true,

    });

    const calendar =
      await this.calendar.execute(
        application.branding.companyName,
      );

    steps.push({

      name: "Create calendar",

      success: true,

    });

    await this.emails.execute();

    steps.push({

      name: "Initialize Gmail",

      success: true,

    });

    await saveWorkspace({

      companyName:
        application.branding.companyName,

      companyFolderId,

      folders,

      documents,

      calendar,

      spreadsheets,

    });

    return {

      success: true,

      companyFolderId,

      foldersCreated:
        application.workspace.folders.length,

      spreadsheets,

      steps,

      message:
        `${application.name} installed successfully.`,

      completedAt:
        new Date(),

    };

  }

}