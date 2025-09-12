# Providers & Setup

SimLab runs locally and requires no external services. To integrate third-party APIs (e.g., model providers), export their credentials as environment variables before running simulations.

Example:
```bash
export OPENAI_API_KEY="sk-..."
```

Keep tokens outside of version control and use `.env` files or secret managers in CI environments.

