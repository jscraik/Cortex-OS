export const tracer = {
  startSpan(name: string) {
    const span: any = {
      name,
      setStatus: (_: any) => {},
      recordException: (_: Error) => {},
      end: () => {},
    };
    return span;
  },
};

export const meter = {
  createCounter: (_: string) => ({ add: (_v: number, _a?: any) => {} }),
  createGauge: (_: string) => ({ record: (_v: number) => {} }),
};

export const logger = {
  startSpan: (name: string) => tracer.startSpan(name),
  info: console.log,
  warn: console.warn,
  error: console.error,
};
