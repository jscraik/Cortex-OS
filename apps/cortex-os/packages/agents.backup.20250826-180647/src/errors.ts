export class AgentError extends Error {
  constructor(public code: string, message: string) {
    super(message);
    this.name = "AgentError";
  }
}

