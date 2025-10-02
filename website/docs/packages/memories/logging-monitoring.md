---
title: Logging Monitoring
sidebar_label: Logging Monitoring
---

# Logging & Monitoring

- The package uses `debug` namespaces such as `memories:store` and `memories:embed`. Enable them via `DEBUG=memories:*`.
- Emit custom metrics by subscribing to events like `memory.stored` and `policy.violation`.
- Integrate with observability stacks (e.g., OpenTelemetry) by wrapping service methods.
