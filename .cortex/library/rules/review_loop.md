# review_loop

purpose

- Require machine-checkable review with evidence.

principles

- Output findings as JSON that passes `review.schema.ts`.
- Each finding must include file path + line range or URL.
- Announce summary for screen readers; include keyboard navigation tips.

examples

- good: `{"severity":"Major","evidence":{"path":"src/x.ts","lines":"12-20"}}`
- bad: "Looks wrong somewhere."

ci_policy

- Reject reviews missing evidence pointers.
- Gate merges on policy thresholds (blockers>0 or majors>budget).
