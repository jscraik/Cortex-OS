/**
 * Utility for managing pending JSON-RPC requests
 */
export interface PendingRequest {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
  timeout: NodeJS.Timeout;
  method: string;
  timestamp: number;
}

export class PendingRequests {
  private requests = new Map<string | number, PendingRequest>();

  add(id: string | number, pending: PendingRequest): void {
    this.requests.set(id, pending);
  }

  get(id: string | number): PendingRequest | undefined {
    return this.requests.get(id);
  }

  delete(id: string | number): void {
    this.requests.delete(id);
  }

  forEach(cb: (pending: PendingRequest, id: string | number) => void): void {
    this.requests.forEach((value, key) => {
      cb(value, key);
    });
  }

  clear(): void {
    this.requests.clear();
  }

  size(): number {
    return this.requests.size;
  }
}
