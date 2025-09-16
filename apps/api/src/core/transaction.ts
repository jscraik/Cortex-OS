import { randomUUID } from 'node:crypto';

export class TransactionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TransactionError';
  }
}

export interface TransactionContext {
  readonly id: string;
  readonly startedAt: number;
}

export class TransactionManager {
  private readonly active = new Map<string, TransactionContext>();

  async runInTransaction<T>(fn: (context: TransactionContext) => Promise<T> | T): Promise<{ result: T; context: TransactionContext }> {
    const context: TransactionContext = { id: randomUUID(), startedAt: Date.now() };
    this.active.set(context.id, context);
    try {
      const value = await fn(context);
      this.active.delete(context.id);
      return { result: value, context };
    } catch (error) {
      this.active.delete(context.id);
      throw new TransactionError((error as Error).message);
    }
  }

  isActive(id: string): boolean {
    return this.active.has(id);
  }
}
