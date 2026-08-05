/**
 * ============================================
 * CLARA OS
 * Runtime Factory
 * --------------------------------------------
 * Responsibility :
 * Creates valid Runtime and RuntimeEvent
 * instances for Clara OS.
 * ============================================
 */

import { BrainContext } from "@/lib/brain";

import { Runtime } from "./runtime";
import { RuntimeContext } from "./runtime-context";
import { RuntimeEvent } from "./runtime-event";

export class RuntimeFactory {

  /**
   * Creates a RuntimeContext.
   */
  public static createContext(): RuntimeContext {

    return {

      brain: {} as BrainContext,

      experiences: [],

      recommendations: [],

      createdAt: new Date(),

    };

  }

  /**
   * Creates a Runtime.
   */
  public static create(): Runtime {

    return {

      id: crypto.randomUUID(),

      name: "Clara Runtime",

      context: this.createContext(),

      active: true,

      startedAt: new Date(),

    };

  }

  /**
   * Creates a RuntimeEvent.
   */
  public static createEvent(
    capabilityId: string,
    context: unknown,
    source = "api",
  ): RuntimeEvent {

    return {

      id: crypto.randomUUID(),

      source,

      capabilityId,

      context,

      receivedAt: new Date(),

    };

  }

}