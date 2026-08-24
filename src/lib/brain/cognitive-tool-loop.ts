/**
 * ============================================
 * CLARA OS
 * Brain Module
 * --------------------------------------------
 * Cognitive Tool Loop
 * --------------------------------------------
 * Coordinates model reasoning with Clara's
 * executable capabilities.
 *
 * Responsibility:
 * - expose registered capabilities to the model
 * - execute requested tool calls
 * - return real execution results to the model
 * - continue reasoning until a final response
 * - protect the cycle with a maximum round count
 * ============================================
 */

import { OpenAIResponsesEngine } from "@/lib/connectors/internal/openai/responses/openai-responses-engine";
import type {
  OpenAIResponsesResult,
  OpenAIToolCall,
} from "@/lib/connectors/internal/openai/responses/openai-responses-result";

import { CapabilityToolBridge } from "@/lib/capabilities/capability-tool-bridge";
import { CapabilityRegistry } from "@/lib/capabilities/capability-registry";

const MAX_TOOL_ROUNDS = 5;

export interface CognitiveToolLoopInput {
  readonly prompt: string;
}

export class CognitiveToolLoop {

  private readonly engine =
    new OpenAIResponsesEngine();

  private readonly bridge =
    new CapabilityToolBridge();

  private readonly registry =
    new CapabilityRegistry();

  /**
   * Runs one bounded cognitive tool cycle.
   */
  public async execute(
    input: CognitiveToolLoopInput,
  ): Promise<OpenAIResponsesResult> {

    const capabilities =
      this.registry.getAvailableCapabilities();

    const tools =
      capabilities.map(
        (capability) => ({
          type: "function" as const,
          name: capability.id,
          description: capability.description,
          parameters:
            capability.id === "read-sheet"
              ? {
                  type: "object",
                  properties: {
                    role: {
                      type: "string",
                      enum: [
                        "crm",
                        "prospects",
                        "clients",
                        "production",
                      ],
                      description:
                        "Workspace spreadsheet role to read.",
                    },
                    range: {
                      type: "string",
                      description:
                        "Google Sheets A1 range to read, for example A1:Z10.",
                    },
                  },
                  required: ["role", "range"],
                  additionalProperties: false,
                }
              : capability.id === "read-calendar"
                ? {
                    type: "object",
                    properties: {
                      timeMin: {
                        type: "string",
                        description:
                          "Optional lower time boundary in ISO 8601 format.",
                      },
                      timeMax: {
                        type: "string",
                        description:
                          "Optional upper time boundary in ISO 8601 format.",
                      },
                    },
                    additionalProperties: false,
                  }
                : capability.id === "create-calendar-event"
                  ? {
                      type: "object",
                      properties: {
                        title: {
                          type: "string",
                          description:
                            "Calendar event title.",
                        },
                        description: {
                          type: "string",
                          description:
                            "Optional calendar event description.",
                        },
                        location: {
                          type: "string",
                          description:
                            "Optional event location.",
                        },
                        start: {
                          type: "string",
                          description:
                            "Event start in ISO 8601 format.",
                        },
                        end: {
                          type: "string",
                          description:
                            "Event end in ISO 8601 format.",
                        },
                        attendees: {
                          type: "array",
                          items: {
                            type: "string",
                          },
                          description:
                            "Optional attendee email addresses.",
                        },
                      },
                      required: [
                        "title",
                        "start",
                        "end",
                      ],
                      additionalProperties: false,
                    }
                  : capability.id === "update-calendar-event"
                    ? {
                        type: "object",
                        properties: {
                          eventId: {
                            type: "string",
                            description:
                              "Google Calendar event identifier to update.",
                          },
                          title: {
                            type: "string",
                            description:
                              "Updated event title.",
                          },
                          description: {
                            type: "string",
                            description:
                              "Updated event description.",
                          },
                          location: {
                            type: "string",
                            description:
                              "Updated event location.",
                          },
                          start: {
                            type: "string",
                            description:
                              "Updated event start in ISO 8601 format.",
                          },
                          end: {
                            type: "string",
                            description:
                              "Updated event end in ISO 8601 format.",
                          },
                          attendees: {
                            type: "array",
                            items: {
                              type: "string",
                            },
                            description:
                              "Updated attendee email addresses.",
                          },
                        },
                        required: [
                          "eventId",
                        ],
                        additionalProperties: false,
                      }
                    : capability.id === "delete-calendar-event"
                      ? {
                          type: "object",
                          properties: {
                            eventId: {
                              type: "string",
                              description:
                                "Google Calendar event identifier to delete.",
                            },
                          },
                          required: [
                            "eventId",
                          ],
                          additionalProperties: false,
                        }
                      : capability.id === "send-gmail"
                        ? {
                            type: "object",
                            properties: {
                              to: {
                                type: "string",
                                description:
                                  "Recipient email address.",
                              },
                              cc: {
                                type: "array",
                                items: {
                                  type: "string",
                                },
                                description:
                                  "Optional CC recipient email addresses.",
                              },
                              bcc: {
                                type: "array",
                                items: {
                                  type: "string",
                                },
                                description:
                                  "Optional BCC recipient email addresses.",
                              },
                              subject: {
                                type: "string",
                                description:
                                  "Email subject.",
                              },
                              body: {
                                type: "string",
                                description:
                                  "Plain-text email body.",
                              },
                            },
                            required: [
                              "to",
                              "subject",
                              "body",
                            ],
                            additionalProperties: false,
                          }
                      : capability.id === "read-gmail"
                        ? {
                            type: "object",
                            properties: {
                              query: {
                                type: "string",
                                description:
                                  "Optional Gmail search query, for example is:unread or from:client@example.com.",
                              },
                            },
                            additionalProperties: false,
                          }
                        : {
                          type: "object",
                          additionalProperties: true,
                        },
          strict:
            capability.id === "read-sheet" ||
            capability.id === "read-calendar" ||
            capability.id === "create-calendar-event" ||
            capability.id === "update-calendar-event" ||
            capability.id === "delete-calendar-event" ||
            capability.id === "read-gmail" ||
            capability.id === "send-gmail",
        }),
      );

    let result =
      await this.engine.generate({
        prompt: input.prompt,
        model: "gpt-5.5",
        tools,
      });

    for (
      let round = 0;
      round < MAX_TOOL_ROUNDS;
      round += 1
    ) {

      if (
        !result.success ||
        !result.toolCalls ||
        result.toolCalls.length === 0
      ) {
        return result;
      }

      const toolOutputs =
        await Promise.all(
          result.toolCalls.map(
            async (toolCall: OpenAIToolCall) => {

              const execution =
                await this.bridge.execute(
                  toolCall,
                );

              return {
                callId: toolCall.callId,
                output: {
                  success: execution.success,
                  capabilityId:
                    execution.capabilityId,
                  message:
                    execution.message,
                  content:
                    execution.content,
                },
              };
            },
          ),
        );

      if (!result.responseId) {
        return {
          ...result,
          success: false,
          message:
            "Tool calls were returned without a Responses API response identifier.",
        };
      }

      result =
        await this.engine.generate({
          prompt: "",
          model: "gpt-5.5",
          previousResponseId:
            result.responseId,
          toolOutputs,
          tools,
        });
    }

    return {
      ...result,
      message:
        result.toolCalls && result.toolCalls.length > 0
          ? `Maximum cognitive tool rounds (${MAX_TOOL_ROUNDS}) reached.`
          : result.message,
    };
  }
}
