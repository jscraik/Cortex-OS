# Configuration

MVP Core reads environment variables for runtime options.

| Variable | Description |
| --- | --- |
| `MVP_CORE_DB_URL` | Database connection string. |
| `MVP_CORE_MAX_EXEC_TIME` | Milliseconds allowed for shell commands. |

You can also define `mvp-core.config.json`:
```json
{
  "dbUrl": "postgres://localhost/test",
  "maxExecTime": 5000
}
```
