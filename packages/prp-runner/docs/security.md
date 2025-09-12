# Security

- Never commit API keys; use environment variables.
- All HTTP traffic should be routed over TLS when calling remote providers.
- Rotate access tokens regularly and follow least-privilege principles.
- Sanitize neuron outputs before forwarding to external systems.
