// Lightweight logger mock compatible with expected API surface
export const logger = {
  info: (..._args: unknown[]) => {},
  warn: (..._args: unknown[]) => {},
  error: (..._args: unknown[]) => {},
  debug: (..._args: unknown[]) => {},
};

export default logger;
