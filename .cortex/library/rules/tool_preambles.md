# tool_preambles

purpose

- Require a one-sentence why before grouped tool calls.

principles

- Rephrase the user goal once at the start of a tool group.
- One sentence per group explaining why now.
- Skip preamble for trivial single reads unless grouped.
- End each group with a 2–3 sentence summary.

examples

- good: "Goal: list failing tests. Now calling gcal.search to fetch today's events."
- bad: "Long speculative paragraphs before every call."

ci_policy

- For any tool call block, require a preceding line starting `Goal:` or `Now:` within 5 lines.
