export const MAX_HISTORY = 100;

const history: unknown[] = [];

export function addState<T>(state: T): void {
  history.push(state);
  if (history.length > MAX_HISTORY) {
    history.splice(0, history.length - MAX_HISTORY);
  }
}

export function getHistory<T>(): T[] {
  return [...(history as T[])];
}

export function clearHistory(): void {
  history.length = 0;
}
