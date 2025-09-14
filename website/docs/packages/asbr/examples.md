---
title: Examples
sidebar_label: Examples
---

# Examples & Tutorials

## Simple Task
```ts
import { initializeASBR } from '@cortex-os/asbr';

const { client } = await initializeASBR({ autoStart: true });
const task = await client.createTask({ name: 'demo', input: {} });
console.log(task.id);
```

More examples live under `examples/` in the repository.
