# Security

- Registry data is stored as plain JSON; avoid placing secrets in server manifests.
- Ensure the configuration directory is only readable by trusted users (`chmod 700 ~/.config/cortex-os`).
- File writes use a lock file to reduce race conditions but do not provide encryption.
