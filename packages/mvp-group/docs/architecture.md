# Architecture

```
Blueprint -> Strategy Node -> Build Node -> Evaluation Node -> Completed State
```

- **Kernel** (`runPRPWorkflow`) orchestrates the PRP phases and validates state transitions.
- **Strategy, Build, Evaluation Nodes** execute phase-specific logic.
- **Observability hooks** record metrics and spans via OpenTelemetry.
