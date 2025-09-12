# Getting Started

## Installation

```bash
pnpm add @cortex-os/mvp
```

## Basic Usage

```typescript
import { createValidator, generateId } from '@cortex-os/mvp';
import { z } from 'zod';

const schema = z.object({ id: z.string() });
const validator = createValidator(schema);
validator.validate({ id: generateId() });
```
