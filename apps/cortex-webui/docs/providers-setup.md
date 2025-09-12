# Providers Setup

Cortex WebUI can connect to external AI providers. Set the following environment variables in the backend `.env` to enable them.

| Provider | Variable |
| --- | --- |
| OpenAI | `OPENAI_API_KEY` |
| Anthropic | `ANTHROPIC_API_KEY` |
| Azure OpenAI | `AZURE_OPENAI_ENDPOINT`, `AZURE_OPENAI_KEY` |

Restart the backend after setting provider credentials.
