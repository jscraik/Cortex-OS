# Troubleshooting

## Enable Debug Logging
Set `RUST_LOG=cortex_github=debug` to see request details.

## Common Errors
- **401 Unauthorized**: token missing or invalid.
- **422 Unprocessable Entity**: payload fails validation; review GitHub API docs.
