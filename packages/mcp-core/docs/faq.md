# FAQ

**Q:** Why do I get "endpoint required for http transports"?
**A:** Ensure `endpoint` is supplied when transport is `streamableHttp` or `sse`.

**Q:** How do I debug a stdio server?
**A:** Run the command manually and verify it accepts JSON lines on stdin and writes responses to stdout.

**Q:** Does the client handle retries?
**A:** Retries are not built in; wrap `callTool` in your own retry logic.
