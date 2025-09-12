# Logging & Monitoring

MVP Core emits structured logs via `console`.
Integrate with external tools by piping stdout.

```ts
// Example: Forward all logs to Datadog
const originalLog = console.log;
console.log = function (...args) {
  sendToDatadog(...args);
  originalLog.apply(console, args);
};
```
