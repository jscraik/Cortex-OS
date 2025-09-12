# User Guide

## Publish a Message

```typescript
await bus.publish(createEnvelope({
  type: 'user.greeting',
  source: 'urn:cortex:example',
  data: { text: 'hi' },
}));
```

## Register a Handler

```typescript
bus.bind([{ type: 'user.greeting', handle: async e => console.log(e.data) }]);
```

