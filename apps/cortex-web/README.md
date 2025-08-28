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

Additionally, tool-call telemetry may be emitted:

```jsonc
{ "type": "tool", "id": "<uuid>", "name": "policy/redaction-check", "status": "start|complete", "args": { /* redacted */ } }
```

## Models

The UI loads models from `config/mlx-models.json` (shape `{ id, label }`) and a `default` model.

## Observability

Set `CHAT_OBSERVABILITY=1` to enable structured logs on stream start/done:

```jsonc
{ "evt": "chat.stream.start", "sessionId": "...", "model": "..." }
{ "evt": "chat.stream.done", "durationMs": 123, "tokenCount": 456 }
```

## Accessibility

The MVP chat page targets WCAG 2.1 AA:

- aria-live region for streamed tokens
- skip link to composer, form labels, keyboard-friendly focus styles
- minimal color usage; avoid color-only cues

Use `pnpm pw:test` with repo-level axe tests to audit accessibility.

## Development tips

- If your provider is down, the gateway automatically falls back to the echo stream.
- For local OpenAI-compatible servers, ensure CORS and streaming are enabled.
