# Cortex Web — Chat Gateway Setup

This app exposes a simple chat MVP with SSE streaming. It can stream from an OpenAI-compatible backend or fall back to a local echo for development.

## Configure backend

Set the following environment variables (see repo `.env.example`):

- `MODEL_API_PROVIDER` — `openai` or `compatible` to enable real streaming; leave empty for local echo fallback.
- `MODEL_API_BASE` — Base URL for OpenAI-compatible API (e.g. `https://api.openai.com` or `http://localhost:11434`).
- `MODEL_API_KEY` — Provider API key (optional for some local providers).

If unset, the stream endpoint will use an "echo" fallback returning the last user message.

## Streaming endpoint

- Route: `GET /app/api/chat/[sessionId]/stream`
- Events: `start` → many `token` → `done`

The server emits JSON over `text/event-stream`:

```jsonc
{ "type": "start", "model": "<model-id>" }
{ "type": "token", "data": "<partial>" }
{ "type": "done",  "messageId": "<uuid>", "text": "<full-text>" }
```

## Models

The UI loads models from `config/mlx-models.json` (shape `{ id, label }`) and a `default` model.

## Development tips

- If your provider is down, the gateway automatically falls back to the echo stream.
- For local OpenAI-compatible servers, ensure CORS and streaming are enabled.
