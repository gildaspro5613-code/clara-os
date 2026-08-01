/**
 * ============================================
 * CLARA OS
 * Core Module
 * --------------------------------------------
 * File : clara.ts
 * Responsibility :
 * Main Clara runtime.
 * ============================================
 */

import { ClaraState } from "./state";
import {
  ClaraSession,
  createSession,
} from "./session";

export class Clara {
  private session: ClaraSession = createSession();

  /**
   * Starts Clara.
   */
  public async start(): Promise<ClaraSession> {
    this.session = createSession();

    this.session.state = ClaraState.STARTING;

    // Future:
    // - Brain initialization
    // - Connectors
    // - Monitor
    // - Planner

    this.session.state = ClaraState.WORKING;
    this.session.updatedAt = new Date();

    return this.session;
  }

  /**
   * Stops Clara.
   */
  public async stop(): Promise<void> {
    this.session.state = ClaraState.STOPPING;
    this.session.updatedAt = new Date();

    this.session.state = ClaraState.STOPPED;
    this.session.updatedAt = new Date();
  }

  /**
   * Returns current state.
   */
  public getState(): ClaraState {
    return this.session.state;
  }

  /**
   * Returns current session.
   */
  public getSession(): ClaraSession {
    return this.session;
  }
}