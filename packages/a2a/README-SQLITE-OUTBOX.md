# A2A SQLite Outbox Repository

Durable outbox implementation for A2A (Agent-to-Agent) communication using SQLite for persistent storage.

## Features

### Persistent Storage
- **SQLite Backend**: Durable message storage using SQLite database
- **Transactional Support**: Full ACID compliance for message operations
- **Indexing**: Optimized database indexes for efficient querying

### Outbox Pattern
- **Message Persistence**: Store messages durably before processing
- **Status Tracking**: Track message processing status (PENDING, PROCESSING, PUBLISHED, FAILED, DEAD_LETTER)
- **Retry Mechanism**: Automatic retry with exponential backoff
- **Idempotency**: Prevent duplicate message processing
- **Cleanup**: Automatic cleanup of processed messages

## Installation

The SQLite outbox repository is included in the main A2A package:

```bash
npm install @cortex-os/a2a
```

## Usage

### Creating the Repository

```typescript
import { SqliteOutboxRepository } from '@cortex-os/a2a';

// Create repository with SQLite database
const outbox = new SqliteOutboxRepository('./outbox.db');

// Or use in-memory database for testing
const inMemoryOutbox = new SqliteOutboxRepository(':memory:');
```

### Saving Messages

```typescript
import { OutboxMessageStatus } from '@cortex-os/a2a-contracts';

// Save a single message
const message = await outbox.save({
  aggregateType: 'user',
  aggregateId: '123',
  eventType: 'user.created',
  payload: { id: '123', name: 'John Doe' },
  metadata: { source: 'registration-service' }
});

// Save a batch of messages
const messages = await outbox.saveBatch([
  {
    aggregateType: 'user',
    aggregateId: '123',
    eventType: 'user.created',
    payload: { id: '123', name: 'John Doe' }
  },
  {
    aggregateType: 'user',
    aggregateId: '456',
    eventType: 'user.created',
    payload: { id: '456', name: 'Jane Smith' }
  }
]);
```

### Retrieving Messages

```typescript
// Find messages by status
const pendingMessages = await outbox.findByStatus(OutboxMessageStatus.PENDING, 10);

// Find messages ready for retry
const retryMessages = await outbox.findReadyForRetry(5);

// Find messages by aggregate
const userMessages = await outbox.findByAggregate('user', '123');
```

### Updating Message Status

```typescript
// Mark message as processed
await outbox.markProcessed(messageId, new Date());

// Update message status
await outbox.updateStatus(messageId, OutboxMessageStatus.PROCESSING);

// Increment retry count
await outbox.incrementRetry(messageId, 'Error message');

// Move to dead letter queue
await outbox.moveToDeadLetter(messageId, 'Max retries exceeded');
```

### Cleanup

```typescript
// Clean up old processed messages
const deletedCount = await outbox.cleanup(new Date(Date.now() - 24 * 60 * 60 * 1000)); // 24 hours ago
```

## Database Schema

The SQLite database uses the following schema:

```sql
CREATE TABLE IF NOT EXISTS outbox_messages (
  id TEXT PRIMARY KEY,
  aggregate_type TEXT NOT NULL,
  aggregate_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload TEXT NOT NULL,
  metadata TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING',
  created_at INTEGER NOT NULL,
  processed_at INTEGER,
  published_at INTEGER,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  last_error TEXT,
  next_retry_at INTEGER,
  idempotency_key TEXT,
  correlation_id TEXT,
  causation_id TEXT,
  traceparent TEXT,
  tracestate TEXT,
  baggage TEXT
);

CREATE INDEX IF NOT EXISTS idx_outbox_status ON outbox_messages(status);
CREATE INDEX IF NOT EXISTS idx_outbox_aggregate ON outbox_messages(aggregate_type, aggregate_id);
CREATE INDEX IF NOT EXISTS idx_outbox_retry ON outbox_messages(status, next_retry_at);
CREATE INDEX IF NOT EXISTS idx_outbox_idempotency ON outbox_messages(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_outbox_cleanup ON outbox_messages(status, processed_at);
```

## Testing

The SQLite outbox repository includes comprehensive tests:

```bash
npm test
```

Test coverage includes:
- All CRUD operations
- Batch operations
- Status transitions
- Retry mechanisms
- Idempotency checks
- Cleanup operations