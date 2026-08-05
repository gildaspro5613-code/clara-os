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

/**
 * Creates workspace calendars.
 */
export class CreateCalendar {

  /**
   * Creates the default calendar.
   */
  public async execute(
    companyName: string,
  ): Promise<string> {

    const calendar =
      GoogleWorkspace.calendar();

    return calendar.createCalendar(

      `${companyName} Calendar`,

    );

  }

}