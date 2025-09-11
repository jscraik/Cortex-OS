# Troubleshooting

## Port Already in Use
Change `ASBR_PORT` or stop the conflicting service.

## Token Validation Failed
Ensure the `Authorization` header contains the current token. Delete stale tokens in the state directory.

## Missing Dependencies
Run `pnpm install` at repository root to install all packages.
