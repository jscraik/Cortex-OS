---
title: Examples
sidebar_label: Examples
---

# Examples & Tutorials

## Validate a user object

```typescript
import { createValidator } from '@cortex-os/mvp';
import { z } from 'zod';

const schema = z.object({ id: z.string(), email: z.string().email() });
const validator = createValidator(schema);
validator.validate({ id: 'u1', email: 'user@example.com' });

```