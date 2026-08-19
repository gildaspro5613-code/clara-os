/**
 * ============================================
 * CLARA OS
 * Telephony Connector
 * --------------------------------------------
 * File : telephony-engine.ts
 * Responsibility :
 * Executes native Clara OS telephony operations
 * through ElevenLabs Conversational AI.
 * ============================================
 */

import { elevenLabsConfig } from "@/lib/config/elevenlabs";
import type { TelephonyContext } from "./telephony-context";
import type { TelephonyResult } from "./telephony-result";

const ELEVENLABS_API_BASE = "https://api.elevenlabs.io/v1";

export class TelephonyEngine {
  private getApiKey(): string {
    const key = elevenLabsConfig.apiKey;

    if (!key) {
      throw new Error(
        "ELEVENLABS_API_KEY is missing.",
      );
    }

    return key;
  }

  private getAgentId(): string {
    const agentId = elevenLabsConfig.agentId;

    if (!agentId) {
      throw new Error(
        "ELEVENLABS_AGENT_ID is missing.",
      );
    }

    return agentId;
  }

  private getAgentPhoneNumberId(): string {
    const phoneNumberId =
      elevenLabsConfig.agentPhoneNumberId;

    if (!phoneNumberId) {
      throw new Error(
        "ELEVENLABS_AGENT_PHONE_NUMBER_ID is missing.",
      );
    }

    return phoneNumberId;
  }

  public async outboundCall(
    context: TelephonyContext,
  ): Promise<TelephonyResult> {
    const toNumber = context.toNumber.trim();

    if (!toNumber) {
      return {
        success: false,
        operation: "outbound-call",
        error: "toNumber is required.",
        completedAt: new Date(),
      };
    }

    try {
      const response = await fetch(
        `${ELEVENLABS_API_BASE}/convai/twilio/outbound-call`,
        {
          method: "POST",
          headers: {
            "xi-api-key": this.getApiKey(),
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            agent_id: this.getAgentId(),
            agent_phone_number_id:
              this.getAgentPhoneNumberId(),
            to_number: toNumber,
            ...(context.dynamicVariables
              ? {
                  conversation_initiation_client_data: {
                    dynamic_variables:
                      context.dynamicVariables,
                  },
                }
              : {}),
          }),
        },
      );

      const data = (await response.json()) as {
        conversation_id?: string;
        callSid?: string;
        detail?: unknown;
      };

      if (!response.ok) {
        throw new Error(
          typeof data.detail === "string"
            ? data.detail
            : `ElevenLabs outbound call error ${response.status}.`,
        );
      }

      return {
        success: true,
        operation: "outbound-call",
        toNumber,
        conversationId: data.conversation_id,
        callSid: data.callSid,
        message: "Clara est en train de lancer l'appel.",
        completedAt: new Date(),
      };
    } catch (error) {
      return {
        success: false,
        operation: "outbound-call",
        toNumber,
        error:
          error instanceof Error
            ? error.message
            : "Impossible de lancer l'appel Clara.",
        completedAt: new Date(),
      };
    }
  }

  public async execute(
    context: TelephonyContext,
  ): Promise<TelephonyResult> {
    switch (context.operation) {
      case "outbound-call":
        return this.outboundCall(context);

      default: {
        const exhaustive: never = context.operation;

        return {
          success: false,
          operation: exhaustive,
          error: `Unknown telephony operation: ${exhaustive}.`,
          completedAt: new Date(),
        };
      }
    }
  }
}
