/**
 * ============================================
 * CLARA OS
 * Telephony API
 * --------------------------------------------
 * File : route.ts
 * Responsibility :
 * Exposes native Clara OS telephony operations.
 * ============================================
 */

import { NextResponse } from "next/server";

import {
  TELEPHONY_MODULE,
} from "@/lib/connectors/internal/telephony";

interface OutboundCallRequest {
  toNumber?: string;
  dynamicVariables?: Record<string, string>;
}

export async function POST(request: Request) {
  try {
    const body =
      (await request.json()) as OutboundCallRequest;

    const toNumber = body.toNumber?.trim();

    if (!toNumber) {
      return NextResponse.json(
        {
          success: false,
          error: "Numéro de destination manquant.",
        },
        { status: 400 },
      );
    }

    const result =
      await TELEPHONY_MODULE.engine.execute({
        operation: "outbound-call",
        toNumber,
        dynamicVariables: body.dynamicVariables,
      });

    if (!result.success) {
      return NextResponse.json(result, {
        status: 502,
      });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("[API /telephony]", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Impossible de lancer l'appel Clara.",
      },
      { status: 500 },
    );
  }
}
