export const MAX_HISTORY = 100;

const history: unknown[] = [];

export function addState<T>(state: T): void {
  history.push(state);
  while (history.length > MAX_HISTORY) {
    history.shift();
  }
}

export function getHistory<T>(): T[] {
  return [...(history as T[])];
}

export function clearHistory(): void {
  history.length = 0;
}
