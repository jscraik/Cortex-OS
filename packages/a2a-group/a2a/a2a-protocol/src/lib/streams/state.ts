/**
 * Pure functional stream state management
 */

export type StreamState = {
  id: string;
  status: 'initialized' | 'streaming' | 'completed' | 'error' | 'abandoned';
  messageCount: number;
  error: string | null;
  lastActive: number;
};

export enum StreamEvent {
  START = 'start',
  MESSAGE = 'message',
  END = 'end',
  ERROR = 'error',
}

type TransitionTable = {
  [K in StreamState['status']]: {
    [E in StreamEvent]?: StreamState['status'];
  };
};

/**
 * Valid state transitions for the stream state machine.
 * Pure constant defining allowed transitions.
 */
const transitions: TransitionTable = {
  initialized: {
    [StreamEvent.START]: 'streaming',
    [StreamEvent.ERROR]: 'error',
  },
  streaming: {
    [StreamEvent.MESSAGE]: 'streaming',
    [StreamEvent.END]: 'completed',
    [StreamEvent.ERROR]: 'error',
  },
  completed: {
    [StreamEvent.ERROR]: 'error',
  },
  error: {},
  abandoned: {},
};

/**
 * Create a new stream state.
 * Pure factory function.
 */
export function createStreamState(id: string): StreamState {
  return {
    id,
    status: 'initialized',
    messageCount: 0,
    error: null,
    lastActive: Date.now(),
  };
}

/**
 * Transition to a new state based on an event.
 * Pure function implementing state machine transitions.
 */
export function transition(
  state: StreamState,
  event: StreamEvent,
  errorMessage?: string,
): StreamState {
  const nextStatus = transitions[state.status]?.[event];
  if (!nextStatus) return state;

  return {
    ...state,
    status: nextStatus,
    messageCount: getNextMessageCount(state, event),
    error: event === StreamEvent.ERROR ? errorMessage || 'Unknown error' : state.error,
  };
}

/**
 * Calculate next message count based on current state and event.
 * Pure helper function.
 */
function getNextMessageCount(state: StreamState, event: StreamEvent): number {
  if (event !== StreamEvent.MESSAGE) return state.messageCount;
  if (state.status !== 'streaming') return state.messageCount;
  return state.messageCount + 1;
}
