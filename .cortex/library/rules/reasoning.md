# reasoning

purpose

- Constrain reasoning disclosure and discipline.

principles

- Show final reasoning summaries only. No chain-of-thought.
- Use stepwise logic: Inputs → Assumptions → Steps → Result.
- Arithmetic: compute digit-by-digit.

examples

- good: "Assumptions A,B. Steps 1–3. Result: X."
- bad: "Here is my secret chain of thought: ..."

ci_policy

- Block literals: `chain of thought|CoT|let's think step by step`.
- Require headings (Inputs, Assumptions, Steps, Result) when a summary is emitted.
