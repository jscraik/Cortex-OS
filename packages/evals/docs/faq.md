# FAQ

**Q: Can I add my own suite?**
A: Yes. Implement the `SuiteDef` interface and register it in the suite registry.

**Q: Do I need a dataset for the router suite?**
A: No. It only measures latency and capability.

**Q: Why did my gate fail?**
A: Check `SuiteOutcome.metrics` and `notes` for threshold violations.
