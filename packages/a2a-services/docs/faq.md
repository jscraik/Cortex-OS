# FAQ

**Q:** Is the schema registry persistent?

**A:** No. Data is kept in memory and clears on restart.

**Q:** How do I increase the rate limit?

**A:** Configure `createRateLimiter({ limit, windowMs })` in your Express setup.
