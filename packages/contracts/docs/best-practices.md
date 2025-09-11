# Best Practices

- Validate all external input with the appropriate schema before processing.
- Use `safeParse` in long-running services to avoid exceptions.
- Persist only data that passes schema validation.
- Keep schema versions pinned to avoid unexpected breaking changes.
