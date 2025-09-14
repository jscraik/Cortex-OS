---
title: Logging Monitoring
sidebar_label: Logging Monitoring
---

# Logging & Monitoring

Integrate with `tracing` subscribers to collect structured logs:

```rust
use tracing_subscriber::fmt;


fmt::init();
```

Metrics can be exported via `prometheus` in downstream services.
