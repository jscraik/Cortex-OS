declare module 'hono-rate-limiter' {
  // Minimal typing to satisfy runtime usage in orchestration
  export function rateLimiter(options?: any): any;
  const _default: { rateLimiter: typeof rateLimiter };
  export default _default;
}
