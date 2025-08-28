export interface Clock {
  nowMs(): number;
  nowISO(): string;
}

export class SystemClock implements Clock {
  nowMs() {
    return Date.now();
  }
  nowISO() {
    return new Date().toISOString();
  }
}
