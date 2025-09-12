# Troubleshooting

## Neo4j Connection Fails
Ensure the database is running and `NEO4J_URI`, `NEO4J_USERNAME`, and `NEO4J_PASSWORD` are correct.

## Qdrant Not Reachable
Check container ports (default 6333) and network firewalls.

## Embeddings Timeout
Increase `MEMORIES_EMBEDDER_TIMEOUT` or verify the MLX/Ollama services are responsive.

## Missing Policies
If a namespace is undefined, the default policy applies. Define policies in `readiness.yml` or code to avoid surprises.
