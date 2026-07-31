export class Clara {
  private state: ClaraState = ClaraState.Stopped;

  public async start(): Promise<void> {
    this.state = ClaraState.Starting;

    // Initialisation de Clara

    this.state = ClaraState.Working;
  }

  public async stop(): Promise<void> {
    this.state = ClaraState.Stopped;
  }

  public getState(): ClaraState {
    return this.state;
  }
}