# Troubleshooting Guide

## Kernel fails to run
- Ensure Node 18+ is installed.
- Run `pnpm build` to compile TypeScript.

## Missing provider token
- Check environment variables like `OPENAI_API_KEY`.

## Non-deterministic state
- Verify deterministic seeds and input validation.
