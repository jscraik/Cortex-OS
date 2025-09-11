# Troubleshooting

| Issue | Resolution |
| --- | --- |
| `Registry file is locked` | Wait for other processes to finish or remove the `.lock` file if stale. |
| `Permission denied` | Ensure the configuration directory is writable. |
| `Invalid JSON` | Delete the corrupted file; the package will recreate it on next write. |
