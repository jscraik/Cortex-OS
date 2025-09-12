# Troubleshooting Guide

## Common Issues
- **Tests hang or never complete**: Ensure `maxTurns` and `timeout` are set appropriately for long-running scenarios.
- **No output generated**: Check write permissions and specify `--output` path.
- **Inconsistent results**: Verify that `deterministic` is true and the `seed` is fixed.

## Diagnostic Tips
- Run with `debug: true` to enable verbose logging.
- Use Node.js `--inspect` flag to attach a debugger.
- Review generated reports for judge notes and evidence.

