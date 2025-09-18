# @cortex-os/policy

Standalone policy engine for Cortex-OS. Exposes:

- `Grant` Zod schema and `Grant` TypeScript type
- `loadGrant(id)` to read and validate `~/.cortex/policy/tools/<id>.json`
- `enforce(grant, action, args)` to verify allowed actions, filesystem scope, and rate limits

## Usage

```ts
import { Grant, loadGrant, enforce } from '@cortex-os/policy';

const grant = await loadGrant('fs');
enforce(grant, 'read', { path: '/project/README.md' });
```
