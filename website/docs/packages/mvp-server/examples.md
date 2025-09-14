---
title: Examples
sidebar_label: Examples
---

# Examples & Tutorials

## Basic Server
```js
import { createServer } from '@cortex-os/mvp-server';

const server = await createServer();
await server.listen({ port: 3000 });
```

## Plugin Example
```js
export default async function (app) {
  app.get('/ping', () ⇒ 'pong');
}

```