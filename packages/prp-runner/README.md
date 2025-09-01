# PRP Runner

Production-grade engine for executing Product Requirement Prompts (PRPs) with deterministic seeds and Zod-validated inputs.

## Usage

```bash
pnpm --filter @cortex-os/prp-runner build
pnpm --filter @cortex-os/prp-runner test
```

## Tests

Run unit and integration tests:

```bash
pnpm --filter @cortex-os/prp-runner test
```

Generate coverage:

```bash
pnpm --filter @cortex-os/prp-runner test:coverage
```

## Accessibility

CLI output is plain-text by default. Pass `--json` for machine-readable logs with ISO-8601 timestamps.

## License

Apache-2.0 OR Commercial
