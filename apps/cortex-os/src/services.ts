export function provideMemories() {
  return new Proxy({}, {
    get(_target, prop) {
      if (typeof prop === "string") {
        return function () {
          throw new Error(`Memories service method "${prop}" is not implemented.`);
        };
      }
      return undefined;
    }
  });
}

export function provideOrchestration() {
  return new Proxy({}, {
    get(_target, prop) {
      if (typeof prop === "string") {
        return function () {
          throw new Error(`Orchestration service method "${prop}" is not implemented.`);
        };
      }
      return undefined;
    }
  });
}

export function provideMCP() {
  return new Proxy({}, {
    get(_target, prop) {
      if (typeof prop === "string") {
        return function () {
          throw new Error(`MCP service method "${prop}" is not implemented.`);
        };
      }
      return undefined;
    }
  });
}

export const tracer = {
  startSpan(_name: string) {
    return {
      setStatus(_status: unknown) {},
      recordException(_err: unknown) {},
      end() {},
    };
  },
};

export function configureAuditPublisherWithBus(_publish: (evt: unknown) => void) {
  // no-op stub
}
