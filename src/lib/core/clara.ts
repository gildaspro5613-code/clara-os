/**
 * ============================================
 * CLARA OS
 * Core Module
 * --------------------------------------------
 * File : clara.ts
 * Responsibility :
 * Main entry point of Clara OS.
 * Manages Clara's lifecycle.
 * ============================================
 */

import { orchestrate } from "./orchestrator";

export enum ClaraState {
  STOPPED = "STOPPED",
  STARTING = "STARTING",
  WORKING = "WORKING",
  STOPPING = "STOPPING",
}

export class Clara {
  private state: ClaraState = ClaraState.STOPPED;

  /**
   * Starts Clara.
   */
  public async start(): Promise<void> {
    if (this.state !== ClaraState.STOPPED) {
      return;
    }

    this.state = ClaraState.STARTING;

    // Future initialization:
    // Scheduler
    // Monitor
    // Connectors

    this.state = ClaraState.WORKING;
  }

  /**
   * Stops Clara.
   */
  public async stop(): Promise<void> {
    if (this.state !== ClaraState.WORKING) {
      return;
    }

    this.state = ClaraState.STOPPING;

    this.state = ClaraState.STOPPED;
  }

  /**
   * Executes one event.
   */
  public async run(event: Parameters<typeof orchestrate>[0]): Promise<void> {
    if (this.state !== ClaraState.WORKING) {
      throw new Error("Clara is not running.");
    }

    await orchestrate(event);
  }

  /**
   * Returns the current state.
   */
  public getState(): ClaraState {
    return this.state;
  }
}

  