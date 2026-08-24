/**
 * ============================================
 * CLARA OS
 * Workspace Installer
 * --------------------------------------------
 * File : create-calendar.ts
 * Responsibility :
 * Creates Google Calendars
 * for a workspace.
 * ============================================
 */

import { GoogleWorkspace } from "@/lib/integrations/google/workspace";
import type { WorkspaceCalendar } from "../../models/workspace-calendar";

/**
 * Creates workspace calendars.
 */
export class CreateCalendar {

  /**
   * Creates the default calendar.
   */
  public async execute(
    companyName: string,
  ): Promise<WorkspaceCalendar> {

    const calendar =
      GoogleWorkspace.calendar();

    const name =
      `${companyName} Calendar`;

    const calendarId =
      await calendar.createCalendar(
        name,
      );

    return {

      name,

      calendarId,

    };

  }

}