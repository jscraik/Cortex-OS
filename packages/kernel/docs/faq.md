# FAQ

**Q:** Does the kernel require a database?  
**A:** No. It runs in-memory but can connect to memory providers.

**Q:** Can I add custom nodes?  
**A:** Yes. Implement node functions and register them with `kernel.addNode`.

**Q:** How do I reset state?  
**A:** Start a new kernel instance or call `createInitialPRPState()`.
