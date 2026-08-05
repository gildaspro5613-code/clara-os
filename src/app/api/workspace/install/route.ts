/**
 * ============================================
 * CLARA OS
 * Workspace Install API
 * --------------------------------------------
 * Responsibility :
 * Starts a Workspace installation.
 * ============================================
 */

import { NextResponse } from "next/server";

import { RuntimeEngine } from "@/lib/runtime/runtime-engine";
import { RuntimeFactory } from "@/lib/runtime/runtime-factory";

export async function POST() {

  const runtime =
    RuntimeFactory.create();

  const event =
    RuntimeFactory.createEvent(

      "workspace-install",

      {

        companyName: "Melodie Digital",

      },

    );

  const engine =
    new RuntimeEngine();

  const result =
    await engine.run(

      runtime,

      event,

    );

  return NextResponse.json(result);

}