import { describe, it, expect, afterEach } from 'vitest';
import { addState, getHistory, clearHistory, MAX_HISTORY } from '../src/lib/history';

describe('history', () => {
  afterEach(() => {
    clearHistory();
  });

  it('does not exceed MAX_HISTORY entries', () => {
    for (let i = 0; i < MAX_HISTORY + 10; i++) {
      addState(i);
    }
    const history = getHistory<number>();
    expect(history.length).toBe(MAX_HISTORY);
    expect(history[0]).toBe(10);
    expect(history[history.length - 1]).toBe(MAX_HISTORY + 9);
  });
});
