# Logging & Monitoring

MVP Core emits structured logs via `console`.
Integrate with external tools by piping stdout.

```ts
SecureCommandExecutor.on('log', entry => sendToDatadog(entry));
```
