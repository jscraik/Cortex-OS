# User Guide

## Validate Data

```typescript
const validator = createValidator(schema);
validator.validate(input);
```

## Generate IDs

```typescript
const id = generateId();
```

## Search Files

```typescript
const files = await new FileManager().glob('src/**/*.ts');
```
