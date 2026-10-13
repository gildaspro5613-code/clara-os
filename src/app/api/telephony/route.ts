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

import { getTranslations } from "next-intl/server";
import { NextResponse } from "next/server";

import {
  TELEPHONY_MODULE,
} from "@/lib/connectors/internal/telephony";

interface OutboundCallRequest {
  toNumber?: string;
  dynamicVariables?: Record<string, string>;
}

export async function POST(request: Request) {
  const t=await getTranslations("telephony");
  try {
    const body =
      (await request.json()) as OutboundCallRequest;

    const toNumber = typeof body.toNumber === "string" ? body.toNumber.trim() : "";

    if (!toNumber) {
      return NextResponse.json(
        {
          success: false,
          error: t("missingNumber"),
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
      return NextResponse.json({success:false,error:t("callError")}, {status:502});
    }

    // Only public call identifiers are returned; never echo provider messages.
    return NextResponse.json({success:true,operation:result.operation,toNumber,
      ...(typeof result.conversationId === "string" ? {conversationId:result.conversationId} : {}),
      ...(typeof result.callSid === "string" ? {callSid:result.callSid} : {}),
      message:t("callStarted"),completedAt:result.completedAt});
  } catch {
    console.error("[API /telephony] call failed");

    return NextResponse.json(
      {
        success: false,
        error:t("callError"),
      },
      { status: 500 },
    );
  }
}
