# Troubleshooting

| Symptom | Resolution |
|---------|------------|
| `ConnectionError` | Verify `--outbound-url` and network connectivity. |
| High latency | Reduce `--rate` or check downstream service performance. |
| No SSE events | Ensure the provider supports SSE and uses proper `Content-Type`. |
