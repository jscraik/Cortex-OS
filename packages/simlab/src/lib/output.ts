export function createStdOutput(text: string): string {
  return text;
}

export function createJsonOutput(data: unknown): string {
  return JSON.stringify({ data });
}

export class StructuredError extends Error {
  constructor(public code: string, message: string, public meta?: unknown) {
    super(message);
  }
  toJSON() {
    return { code: this.code, message: this.message, meta: this.meta };
  }
}
