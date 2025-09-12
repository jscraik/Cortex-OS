# Architecture

The toolkit is organized as lightweight shell scripts emitting JSON envelopes.

```
scout -> codemod -> diff -> validate -> apply
```

- **tools/**: individual wrappers
- **Justfile**: orchestration recipes
- **docs/**: current documentation set
