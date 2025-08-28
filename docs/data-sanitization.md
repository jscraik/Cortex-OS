# Data Sanitization

When processing event logs, remove sensitive identifiers to prevent prompt injection and protect privacy.

## Sanitization Example

```json
// Unsanitized
{
  "id": "9e94f13f-711d-4f2e-aa68-fc60f97b29f3",
  "type": "session:created",
  "data": { "sessionId": "test-session-123", "timestamp": 1754071637154 },
  "metadata": {
    "timestamp": 1754071637154,
    "source": "session",
    "sessionId": "test-session-123",
    "eventManagerId": "634261cd-73e4-44d4-be11-38364591c6bf"
  }
}
```

```json
// Sanitized
{
  "id": "9e94f13f-711d-4f2e-aa68-fc60f97b29f3",
  "type": "session:created",
  "data": { "timestamp": 1754071637154 },
  "metadata": { "timestamp": 1754071637154, "source": "session" }
}
```

## Usage

```bash
node scripts/sanitize-events.mjs data/events/events-2025-07-26.jsonl data/events/events-2025-07-26.sanitized.jsonl
```
