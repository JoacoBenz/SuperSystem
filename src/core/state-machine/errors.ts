export class TransitionError extends Error {
  constructor(
    message: string,
    public readonly currentState: string,
    public readonly action: string,
  ) {
    super(message);
    this.name = 'TransitionError';
  }
}

export class GuardError extends Error {
  constructor(
    public readonly guardName: string,
    public readonly reason: string,
  ) {
    super(`Guard "${guardName}" failed: ${reason}`);
    this.name = 'GuardError';
  }
}
