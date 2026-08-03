/**
 * ============================================
 * CLARA OS
 * Capability Router
 * --------------------------------------------
 * File : capability-router.ts
 * Responsibility :
 * Resolves a capability into the
 * connector responsible for executing it.
 * ============================================
 */

export type Capability =

  | "generate-text"

  | "generate-document"

  | "publish-document"

  | "send-email"

  | "schedule-event"

  | "store-file"

  | "retrieve-file"

  | "speech-to-text"

  | "text-to-speech"

  | "unknown";

/**
 * Capability Router.
 *
 * Determines which connector should
 * execute a requested capability.
 */
export class CapabilityRouter {

  /**
   * Resolves a capability.
   */
  public resolve(
    capability: Capability,
  ): string {

    switch (capability) {

      case "generate-text":
        return "openai.responses";

      case "generate-document":
        return "publisher";

      case "publish-document":
        return "publisher";

      case "send-email":
        return "google.gmail";

      case "schedule-event":
        return "google.calendar";

      case "store-file":
        return "google.drive";

      case "retrieve-file":
        return "google.drive";

      case "speech-to-text":
        return "openai.audio";

      case "text-to-speech":
        return "openai.audio";

      default:
        return "unknown";

    }

  }

}