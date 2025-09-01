# Cortex Web UI

<div align="center">

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![React](https://img.shields.io/badge/React-18+-blue)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3+-blue)](https://www.typescriptlang.org/)
[![Build Status](https://img.shields.io/badge/build-passing-brightgreen)](#build-status)
[![WCAG 2.1 AA](https://img.shields.io/badge/WCAG-2.1%20AA-green)](https://www.w3.org/WAI/WCAG21/quickref/)
[![OpenAI Compatible](https://img.shields.io/badge/OpenAI-compatible-orange)](https://platform.openai.com/docs/api-reference)
[![MLX Models](https://img.shields.io/badge/MLX-optimized-purple)](https://ml-explore.github.io/mlx/)

**Real-time Chat Interface with Server-Sent Events Streaming**

*WCAG 2.1 AA compliant chat gateway with OpenAI-compatible backend integration*

</div>

---

## 🎯 Features

- **💬 Real-time Chat**: Server-Sent Events (SSE) streaming for instant responses
- **🔌 OpenAI Compatible**: Works with OpenAI API and local compatible servers (Ollama, LocalAI)
- **📱 Responsive Design**: Mobile-first, accessible chat interface
- **♿ WCAG 2.1 AA**: Full accessibility compliance with screen reader support
- **🍎 MLX Optimized**: Native Apple Silicon acceleration for local models
- **📊 Observability**: Structured logging and performance metrics
- **🎨 Modern UI**: Clean, minimalist chat experience
- **⌨️ Keyboard Navigation**: Complete keyboard accessibility

## Quick Start

### Environment Configuration

Set the following environment variables (see repo `.env.example`):

- `MODEL_API_PROVIDER` — must be `openai` or `compatible`.
- `MODEL_API_BASE` — Base URL for OpenAI-compatible API (e.g. `https://api.openai.com` or `http://localhost:11434`).
- `MODEL_API_KEY` — Provider API key (optional for some local providers).

### Installation

```bash
# Install dependencies
pnpm install

# Start development server
cd apps/cortex-webui
pnpm dev

# Build for production
pnpm build
```

## API Endpoints

### Chat Streaming

- **Route**: `GET /app/api/chat/[sessionId]/stream`
- **Method**: Server-Sent Events (SSE)
- **Events**: `token` events → `done` event

The server emits JSON over `text/event-stream`:

```jsonc
{ "type": "token", "data": "<partial>" }
{ "type": "done",  "messageId": "<uuid>", "text": "<full-text>" }
```

### Model Configuration

The UI loads available models from `config/mlx-models.json`:

```json
{
  "models": [
    { "id": "gpt-4", "label": "GPT-4" },
    { "id": "claude-3-sonnet", "label": "Claude 3 Sonnet" },
    { "id": "llama3-8b", "label": "Llama 3 8B (Local)" }
  ],
  "default": "gpt-4"
}
```

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

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   React Client  │───▶│  SSE Streaming   │───▶│  OpenAI API     │
│                 │    │                  │    │                 │
│ Message Compose │    │ Token Streaming  │    │ Chat Completion │
│ Chat History    │    │ Session Management│    │ Model Selection │
│ Model Selection │    │ Error Handling   │    │ Rate Limiting   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │   Observability │
                       │                 │
                       │ Structured Logs │
                       │ Performance     │
                       │ Token Metrics   │
                       └─────────────────┘
```

## Development

### Local Development

```bash
# Install workspace dependencies
pnpm install

# Start development server
cd apps/cortex-webui
pnpm dev

# Open in browser
open http://localhost:3000
```

### Local Backend Setup

For testing with local models (Ollama, LocalAI):

```bash
# Example with Ollama
export MODEL_API_PROVIDER=compatible
export MODEL_API_BASE=http://localhost:11434
export MODEL_API_KEY=""  # Optional for local servers

# Start the development server
pnpm dev
```

## Testing

### Accessibility Testing

Run the app-local Vitest configuration to test WCAG 2.1 AA compliance:

```bash
# Install workspace deps (if you haven't already)
pnpm install

# Run accessibility tests
cd apps/cortex-webui
pnpm exec vitest --config=vitest.config.ts __tests__/mvp-chat.a11y.test.ts --run
```

### Integration Testing

```bash
# Run all tests
pnpm test

# Run with coverage
pnpm test:coverage

# Run E2E tests
pnpm test:e2e
```

## Performance

- **Streaming Latency**: ~50ms first token (local models)
- **Memory Usage**: <100MB base client
- **Bundle Size**: ~500KB gzipped
- **Lighthouse Score**: 95+ Performance, 100 Accessibility

## Browser Support

- Chrome 88+
- Firefox 85+
- Safari 14+
- Edge 88+

*Requires Server-Sent Events and modern JavaScript features*

## Contributing

1. Follow [CONTRIBUTING.md](../../CONTRIBUTING.md) guidelines
2. Ensure WCAG 2.1 AA compliance
3. Test with screen readers
4. Maintain performance budgets
5. Run accessibility tests before PR submission

## Notes

- **Local Testing**: Ensure CORS and streaming are enabled for local OpenAI-compatible servers
- **Test Isolation**: The per-app `vitest.config.ts` ensures tests run in a `jsdom` environment for DOM accessibility testing
- **Workspace Integration**: Do not run tests from repository root unless you intend to run all packages' test suites
