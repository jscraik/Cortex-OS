---
title: User Guide
sidebar_label: User Guide
---

# User Guide

## Validate Data

```typescript
const validator = createValidator(schema);
validator.validate(input);
```

## Generate IDs

```typescript
const id &#61; generateId();
```

## Search Files

```typescript
const files = await new FileManager().glob('src/**/*.ts');

```