/**
 * ============================================
 * CLARA OS
 * API
 * --------------------------------------------
 * File : route.ts
 * Responsibility :
 * Installs one Clara application.
 * ============================================
 */

import { NextResponse } from "next/server";

import { BusinessFactory } from "@/business/business-factory";
import { WorkspaceInstaller } from "@/onboarding/services/workspace-installer";

/**
 * POST /api/onboarding/install
 */
export async function POST() {

  try {

    const business =
      BusinessFactory.create();

    const application =
      business.getApplication(
        "clara-essentials",
      );

    if (!application) {

      return NextResponse.json(

        {

          success: false,

          message:
            "Application not found.",

        },

        {

          status: 404,

        },

      );

    }

    const installer =
      new WorkspaceInstaller();

    const result =
      await installer.install(
        application,
      );

    return NextResponse.json(result);

  } catch (error) {

    return NextResponse.json(

      {

        success: false,

        message:
          error instanceof Error
            ? error.message
            : "Unknown error.",

      },

      {

        status: 500,

      },

    );

  }

}