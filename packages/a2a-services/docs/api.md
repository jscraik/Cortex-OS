# API Reference

## Base URL
`http://localhost:3000`

## Endpoints
| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/schemas` | Register a new schema. Body must include `name`, `version`, and `schema`. |
| `GET` | `/schemas` | List all schemas. |
| `GET` | `/schemas/:name` | List all versions for a schema name. |
| `GET` | `/schemas/:name/latest` | Retrieve the highest semantic version for a schema name. |
| `GET` | `/schemas/:name/:version` | Fetch a specific schema version. |

No authentication is required in the current prototype.
