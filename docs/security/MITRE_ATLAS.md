# MITRE ATLAS Coverage

The Cortex-OS security program maps safeguards and tests to the [MITRE ATLAS](https://atlas.mitre.org) framework for adversarial threats against AI systems. Coverage highlights include:

- **Model Evasion** – detection of adversarial perturbations in inference inputs.
- **Model Poisoning** – checks for tampering in training data pipelines.
- **Output Manipulation** – enforced deterministic seeds and schema validation for agent responses.

## Exceptions

- No automated defenses for physical adversarial attacks.
- Limited visibility into third-party model supply chains.

Exceptions are tracked and reviewed during `pnpm atlas:assess` to drive future mitigations.
