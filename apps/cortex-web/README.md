# Cortex Web — Chat Gateway Setup

This app exposes a simple chat MVP with SSE streaming from an OpenAI-compatible backend.

## Configure backend

Set the following environment variables (see repo `.env.example`):

- `MODEL_API_PROVIDER` — must be `openai` or `compatible`.
- `MODEL_API_BASE` — Base URL for OpenAI-compatible API (e.g. `https://api.openai.com` or `http://localhost:11434`).
- `MODEL_API_KEY` — Provider API key (optional for some local providers).

## Streaming endpoint

- Route: `GET /app/api/chat/[sessionId]/stream`
- Events: many `token` → `done`

The server emits JSON over `text/event-stream`:

```jsonc
{ "type": "token", "data": "<partial>" }
{ "type": "done",  "messageId": "<uuid>", "text": "<full-text>" }
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

- For local OpenAI-compatible servers, ensure CORS and streaming are enabled.

## Testing

Run the app-local Vitest configuration from the `apps/cortex-web` directory to avoid collecting tests from the entire monorepo. Example commands (zsh / macOS):

```bash
# install workspace deps (if you haven't already)
pnpm install

# run the app-local a11y tests (uses apps/cortex-web/vitest.config.ts)
cd apps/cortex-web
pnpm exec vitest --config=vitest.config.ts __tests__/mvp-chat.a11y.test.ts --run
```

Notes:

- Do not run tests from the repository root with workspace-wide filters unless you intend to run all packages' suites; that can trigger integration tests that require external services and produce large logs.
- The per-app `vitest.config.ts` ensures tests with `.a11y.test.ts` run in a `jsdom` environment so axe can examine DOM output.
