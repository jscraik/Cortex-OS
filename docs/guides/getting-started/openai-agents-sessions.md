# OpenAI Agents SDK Sessions Primer

Cortex-OS agents often operate as part of brAInwav's autonomous orchestration pipelines. Sessions provide the short-term memory layer that lets a runner remember prior turns without manually stitching inputs together. This guide explains why sessions matter, how to enable them quickly, and how to keep session storage healthy over time.

## What Sessions Do (Plain English)

A session is a lightweight memory log keyed by a conversation identifier. When you pass a session into `Runner.run(...)`, the OpenAI Agents SDK loads previous turns so your agent can reason with continuity and follow-up questions. Without a session, each run is stateless.

Key behaviors:

- **Memory continuity**: Each call to `Runner.run` appends to the same conversation history.
- **Tool awareness**: Tool calls invoked in prior turns remain in the transcript for later reasoning.
- **Pluggable storage**: Choose local SQLite, managed OpenAI conversations, or any SQL engine through SQLAlchemy.

## Minimal Enablement (Copy & Paste)

```python
from openai_agents import Agent, Runner
from openai_agents.sessions import SQLiteSession  # or SQLAlchemySession, OpenAIConversationsSession

agent = Agent(name="Assistant", instructions="Be concise.")
session = SQLiteSession("conversation_123", "conversation_history.db")

runner = Runner()
out1 = runner.run(agent, "Hey, remember this fact: the build ID is 42", session=session)
out2 = runner.run(agent, "What did I just tell you?", session=session)
print(out2.output_text)
```

### brAInwav Tip
- Start with deterministic conversation identifiers (e.g., job or ticket IDs) so logs correlate with Cortex-OS workflows.
- Store SQLite databases inside the service's writable data directory to respect deployment sandbox rules.

## Picking a Session Backend

| Backend | When to Use | Operational Notes |
| --- | --- | --- |
| `SQLiteSession` | Local development, prototypes, single-runner services | Zero configuration. File-based storage; replicate or rotate DB files per tenant. |
| `SQLAlchemySession` | Production workloads needing concurrent writers or managed databases | Supports Postgres, MySQL, or SQLite. Control table creation with `create_tables=False` and run migrations via the standard brAInwav Flyway pipelines. |
| `OpenAIConversationsSession` | Hosted conversation storage managed by OpenAI | No infrastructure to manage. Verify data residency and retention policies with your security team before enabling. |

### Migration Guidance
1. Build with SQLite to validate agent behavior quickly.
2. Introduce SQLAlchemy when you require HA, clustering, or central audit logs.
3. Toggle backends via configuration (environment variables) so staged deployments can switch without redeploying code.

## Hygiene: Persistence & Expiry

The SDK does not expire sessions automatically. brAInwav services should:

- **Purge stale sessions**: Schedule jobs that delete conversations older than your retention policy.
- **Trim transcripts**: Remove or summarize older turns when histories grow beyond your latency or token budget target.
- **Compress storage**: Apply gzip or database-level compression if transcripts become large.
- **Test TTL logic**: Unit test pruning helpers to guarantee they do not remove active conversations.

Refer to the internal Cookbook entry *Short-Term Memory Management with Sessions* (Sep 9, 2025) for trimming and compression recipes that pair well with Cortex-OS monitoring.

## Production Checklist

Before promoting a session-enabled agent to production, ensure:

- ✅ Automated tests cover consecutive runs with tool invocations.
- ✅ Observability captures session key, token counts, and storage latency.
- ✅ Release notes track SDK updates that affect session handling (e.g., SQLAlchemy backend improvements).
- ✅ Incident runbooks include steps to inspect or truncate session stores safely.

## Troubleshooting & FAQ

**The agent forgets earlier turns.**
- Confirm the same `session` instance (or ID) is reused across calls.
- Verify storage paths are writable and not reset between runs.

**SQLite files keep growing.**
- Trim transcripts and run `VACUUM` during maintenance windows.
- Rotate databases per customer or time window.

**SQLAlchemy migrations conflict with existing tables.**
- Set `create_tables=False` in production and apply schema changes through managed migrations.

**How do I clear state for tests?**
- Instantiate unique conversation IDs per test or delete rows in teardown hooks.

## Next Steps

- Wire sessions into your Cortex-OS pipelines, then add telemetry dashboards for token usage.
- Review the brAInwav memory governance rules in `docs/memory-guard.md` to ensure alignment.
- Explore the SDK's custom `Session` interface if you need to integrate with proprietary storage.

By following this primer, your Cortex-OS agents gain reliable short-term memory while staying compliant with brAInwav operational standards.
