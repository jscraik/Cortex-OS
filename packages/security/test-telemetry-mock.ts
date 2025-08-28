export const withSpan = async <T>(_: string, fn: (span: unknown) => Promise<T>) =>
  fn({});
export const logWithSpan = () => {};
