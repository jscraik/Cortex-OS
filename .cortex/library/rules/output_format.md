# output_format

purpose

- Standardize structure and schemas.

principles

- Honor requested format first; else default: code-first, then brief why.
- For JSON outputs: strict schema with `$schema` or zod id.
- Provide filenames for code blocks; use four-backtick fences for `.md`.

examples

- good: "`ts:apps/app.ts`"
- bad: "Unlabeled code fences."

ci_policy

- Fail unlabeled code blocks in code responses.
- Validate JSON against referenced schema path.
