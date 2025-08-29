# Event Schema Registry Implementation

This document describes the Event Schema Registry implementation for the Cortex-OS A2A (Agent-to-Agent) messaging system, providing centralized schema management, validation, and versioning for event-driven architectures.

## Overview

The Event Schema Registry provides a centralized system for managing event schemas, enabling:

- **Schema Validation**: Automatic validation of event data against registered schemas
- **Version Management**: Support for multiple versions of the same event type
- **Schema Evolution**: Compatibility checking and migration guidance
- **Documentation**: Auto-generated schema documentation
- **Governance**: Centralized control over event schema definitions

## Architecture

The schema registry consists of several key components:

- **Schema Registry Core**: In-memory storage and validation engine
- **Schema Types**: TypeScript interfaces for schema metadata and validation
- **Validation Utilities**: Common schemas and validation patterns
- **Bus Integration**: Automatic validation in A2A message bus

## Core Features

### Schema Registration

```typescript
import { SchemaRegistry } from '@cortex-os/a2a-core/schema-registry';
import { z } from 'zod';

const registry = new SchemaRegistry();

// Register a schema
registry.register({
  eventType: 'user.created.v1',
  version: '1.0.0',
  schema: z.object({
    type: z.literal('user.created.v1'),
    data: z.object({
      id: z.string().uuid(),
      email: z.string().email(),
      firstName: z.string().min(1),
      lastName: z.string().min(1),
    }),
  }),
  description: 'User account created event',
  tags: ['user', 'creation'],
});
```

### Schema Validation

```typescript
// Validate event data
const result = registry.validate('user.created.v1', eventData);

if (result.valid) {
  console.log('Event is valid!', result.data);
} else {
  console.error('Validation errors:', result.errors);
}
```

### Version Management

```typescript
// Get latest schema for event type
const latestSchema = registry.getLatestSchema('user.created.v1');

// Get specific version
const v1Schema = registry.getSchemaByVersion('user.created.v1', '1.0.0');

// Search schemas
const userSchemas = registry.searchSchemas({
  eventType: 'user.created.v1',
  tags: ['user'],
  limit: 10,
});
```

## Schema Compatibility

The registry supports schema evolution with compatibility checking:

```typescript
// Check compatibility before registering new version
const newSchema = z.object({
  // ... new schema definition
});

const compatibility = registry.checkCompatibility('user.created.v1', newSchema);

if (compatibility.compatible) {
  console.log('Schema is compatible!');
} else {
  console.log('Compatibility issues:', compatibility.issues);
  console.log('Recommendations:', compatibility.recommendations);
}
```

## Bus Integration

The schema registry integrates seamlessly with the A2A bus:

```typescript
import { createBus } from '@cortex-os/a2a-core/bus';
import { SchemaRegistry } from '@cortex-os/a2a-core/schema-registry';

// Create bus with schema validation
const registry = new SchemaRegistry();
const bus = createBus(transport, undefined, registry);

// All published messages are automatically validated
await bus.publish(envelope); // Throws error if invalid
```

## Predefined Schemas

The registry includes predefined schemas for common event types:

```typescript
import { PredefinedSchemas } from '@cortex-os/a2a-contracts/schema-validation-utils';

// Register common event schemas
registry.register(PredefinedSchemas.userCreated);
registry.register(PredefinedSchemas.orderCreated);
registry.register(PredefinedSchemas.paymentProcessed);
```

## Common Schema Patterns

### Event Envelope

All events follow the CloudEvents 1.0 specification:

```typescript
const BaseEventSchema = z.object({
  id: z.string().uuid(),
  type: z.string().min(1),
  source: z.string().url(),
  specversion: z.literal('1.0'),
  time: z.string().datetime().optional(),
  data: z.unknown().optional(),
  datacontenttype: z.string().optional(),
  dataschema: z.string().url().optional(),
  subject: z.string().optional(),
});
```

### Common Data Types

```typescript
const CommonSchemas = {
  uuid: z.string().uuid(),
  email: z.string().email(),
  money: z.object({
    amount: z.number().positive(),
    currency: z.string().length(3).toUpperCase(),
  }),
  address: z.object({
    street: z.string().min(1),
    city: z.string().min(1),
    state: z.string().min(1),
    zipCode: z.string().min(1),
    country: z.string().length(2).toUpperCase(),
  }),
  // ... more common types
};
```

## Schema Evolution Best Practices

### Semantic Versioning

- **MAJOR**: Breaking changes (incompatible)
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes (fully compatible)

### Compatibility Modes

- **BACKWARD**: New schemas must accept all data that old schemas accepted
- **FORWARD**: Old schemas must accept all data that new schemas produce
- **FULL**: Both backward and forward compatibility
- **NONE**: No compatibility requirements

### Migration Strategy

1. **Register new schema version** with compatibility checking
2. **Update producers** to use new schema
3. **Ensure consumers** can handle both versions
4. **Monitor** for validation errors
5. **Deprecate** old version when safe

## Configuration Options

```typescript
const registry = new SchemaRegistry({
  strictValidation: true, // Enable strict validation
  enableCache: true, // Cache schemas in memory
  cacheTtlMs: 300000, // Cache TTL (5 minutes)
  validateOnRegistration: true, // Validate schemas when registered
  maxVersionsPerType: 10, // Maximum versions per event type
});
```

## Statistics and Monitoring

```typescript
const stats = registry.getStats();
console.log('Registry Stats:', {
  totalSchemas: stats.totalSchemas,
  uniqueEventTypes: stats.uniqueEventTypes,
  cacheHitRate: stats.cacheHitRate,
  avgValidationTimeMs: stats.avgValidationTimeMs,
});
```

## Error Handling

The registry provides detailed validation errors:

```typescript
try {
  await bus.publish(invalidEnvelope);
} catch (error) {
  if (error.message.includes('Schema validation failed')) {
    console.log('Validation error details:', error.message);
  }
}
```

## Performance Considerations

- **Caching**: Schemas are cached in memory for fast access
- **Validation**: Zod provides high-performance validation
- **Memory**: In-memory storage suitable for development/production
- **Scaling**: Consider external storage for large-scale deployments

## Integration with Development Workflow

### Schema Testing

```typescript
// Generate test data from schema
const testData = generateTestData(schema);

// Validate against multiple versions
const results = SchemaValidationUtils.validateAgainstVersions(testData, [
  { version: '1.0.0', schema: oldSchema },
  { version: '1.1.0', schema: newSchema },
]);
```

### Documentation Generation

```typescript
// Generate schema documentation
const docs = SchemaValidationUtils.generateSchemaDocs(schema, 'user.created.v1');
console.log(docs);
```

### Migration Guides

```typescript
// Create migration guide
const guide = SchemaValidationUtils.createMigrationGuide('1.0.0', '1.1.0', [
  {
    field: 'phone',
    change: 'added',
    description: 'Added optional phone number field',
  },
]);
```

## Example Usage

See `packages/a2a/a2a-examples/schema-registry-example.ts` for a complete working example demonstrating:

- Schema registration and validation
- Event publishing with automatic validation
- Schema compatibility checking
- Registry statistics and search
- Error handling and recovery

## Running the Example

```bash
cd packages/a2a/a2a-examples
npx ts-node schema-registry-example.ts
```

This demonstrates a complete e-commerce workflow with proper schema validation throughout the entire event chain.
