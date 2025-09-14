---
title: Api
sidebar_label: Api
---

# API Reference / SDK Overview

```ts
import { provideMemories } from '@cortex-os/memories';

const memories = await provideMemories();
await memories.store({ text: 'hello world' });
const results = await memories.search('hello');
```

`provideMemories()` reads env vars to configure stores, encryption, embedders, and decay. Returned objects implement CRUD and vector search methods.
