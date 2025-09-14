# Security

- Tools operate entirely on the local filesystem; no network calls are made.
- Patch application performs a dry run before modifying the working tree.
- Store any provider tokens as environment variables and avoid committing them.
- Validators surface lint and test failures to prevent unsafe commits.
