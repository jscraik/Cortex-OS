# Troubleshooting

| Symptom | Resolution |
| --- | --- |
| `Unsupported transport` error | Ensure `transport` is one of `stdio`, `sse`, `streamableHttp`. |
| Client hangs using stdio | Verify the child process prints a newline and is flushed. |
| `HTTP 401` responses | Check `headers` for correct authentication tokens. |
