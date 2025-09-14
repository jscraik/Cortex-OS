# Providers / Setup

External services use environment variables:

| Provider | Env Var | Description |
| --- | --- | --- |
| OpenAI / Ollama | `OPENAI_API_KEY` / `OLLAMA_BASE_URL` | Model backends for LLM calls. |
| Postgres | `DATABASE_URL` | Persistence for services. |
| Local Memory | `LOCAL_MEMORY_BASE_URL` | Agent memory store. |

Add these to your `.env.local` file before starting the runtime.
