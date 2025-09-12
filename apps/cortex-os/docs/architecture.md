# Architecture

The app composes `provideMemories()` from the `@cortex-os/memories` package. It layers short-term and long-term stores, optional encryption, and embedding providers. Requests flow through:

1. Client code calls `provideMemories()`.
2. Factory selects storage backends and embedders based on env vars.
3. Memory entries are optionally encrypted and indexed.
4. Queries fan out to short and long stores, merging results.
