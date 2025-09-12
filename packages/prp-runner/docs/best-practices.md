# Best Practices

- Prefer local embedding adapters during development to avoid external costs.
- Use `pnpm test` and `pnpm lint` before committing changes.
- Keep neuron implementations pure and side-effect free.
- Store long-running secrets in environment variables rather than code.
