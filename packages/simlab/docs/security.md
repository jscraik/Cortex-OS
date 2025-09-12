# Security

- Store API tokens in environment variables or secret managers; never commit them.
- All inter-component communication occurs in-process, avoiding network exposure.
- Use TLS when integrating external providers.
- Regularly rotate credentials used in simulations.

