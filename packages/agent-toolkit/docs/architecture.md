# Architecture

The toolkit is organized as lightweight POSIX shell scripts that emit JSON envelopes. A typical flow is:

```
scout -> codemod -> diff -> validate -> apply
```

## Components
- **tools/**: individual search, rewrite, diff and validator wrappers
- **Justfile**: orchestration recipes (`just scout`, `just codemod`, `just verify`)
- **docs/**: documentation set

Each wrapper writes structured results to stdout and logs diagnostics to stderr, enabling safe composition in automated pipelines.
