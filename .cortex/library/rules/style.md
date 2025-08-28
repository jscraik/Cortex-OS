# style

purpose

- Enforce response tone and brevity.

principles

- Short declarative sentences. No ellipses or exclamation points.
- Use the user’s requested format first.
- No filler or pleasantries.

examples

- good: "Here is the plan. Step 1. Step 2."
- bad: "Great! I'm thrilled to help…"

ci_policy

- Regex-fail on `[!]|…`.
- Enforce avg sentence length ≤ 18 words (checker).
