export function provideMemories() {
  return {};
}

export function provideOrchestration() {
  return {};
}

export function provideMCP() {
  return {};
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
