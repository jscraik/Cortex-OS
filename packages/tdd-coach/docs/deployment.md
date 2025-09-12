# Deployment

## CI Integration
Add a validation step in your CI pipeline:
```yaml
- run: tdd-coach validate --files $(git diff --name-only)
```

## Containerization
TDD Coach can run inside Node-based containers. Install the package globally during image build.
