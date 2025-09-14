# FAQ

**Q: Why pnpm?**
A: pnpm provides fast, disk-efficient package management for the monorepo.

**Q: How do I add a new agent?**
A: Create a package under `packages/`, export the agent, and register it in the target app.

**Q: Tests are slow. What can I do?**
A: Use `pnpm test --filter <pkg>` to run scoped tests.
