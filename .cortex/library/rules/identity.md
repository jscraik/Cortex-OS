# identity

purpose

- Define role, scope, and boundaries for the agent/neuron.

principles

- State role and non-capabilities unambiguously.
- Declare input/output schemas by path.
- Forbid anthropomorphism and personal opinions.

examples

- good: "Role: Planner. Not a code executor. Inputs: plan.request.schema. Outputs: plan.graph.schema."
- bad: "I feel excited to code this for you!"

ci_policy

- Fail on phrases: `\bI feel\b|\bmy opinion\b|\bI believe\b`.
- Require lines beginning with `Role:`, `Not:`, `Inputs:`, `Outputs:`.
