# Cortex-OS Prompt Governance Policy

## Purpose

All Cortex-OS prompts — from **system prompts (cerebrum)** to **neurons**, **tasks**, and **implement flows** — must follow the Cortex-OS **10-block Prompt Standard**.  
This ensures vendor-neutral, testable, and governable AI behavior.

## Prompt Standard

Prompts must contain these 10 blocks in order:

1. **Task context**
2. **Tone context**
3. **Background data, docs, images**
4. **Rules**
5. **Examples (few-shot)**
6. **Conversation history**
7. **Immediate request**
8. **Deliberation (reasoning_effort knob)**
9. **Output formatting (schema + response prefix)**
10. **Prefill (stub output)**

## Vendor Alignment

- **GPT-5**: reasoning_effort, preambles, previous_response_id → mapped to deliberation/history.
- **Claude**: XML tags, prefill, in-character rules → mapped to examples, history, rules.
- **Gemini**: response prefix, structured JSON, few-shot → mapped to output_format + examples.
- **MLX adapter**: loads same capability packs; placeholders resolved locally.

## Governance Rules

- **Schema validation required**:  
  Each prompt must declare `inputs_schema` and `outputs_schema`.
- **CI enforced**:  
  Any prompt missing mandatory blocks or failing schema check → PR blocked.
- **Consistency required**:  
  System prompt, neurons, tasks, implement prompts all adopt this same schema.
- **No ad-hoc prompts**:  
  Inline, unstructured prompts in code are forbidden. Use `CONTEXT/library/packs/` only.
- **Accessibility required**:  
  Output must respect `a11y_flags` (screen-reader labels, no color-only signaling).

## CI Policy

Fail a PR if:

- A new or modified prompt omits any of the 10 blocks.
- A prompt lacks `inputs_schema` or `outputs_schema`.
- Output examples fail schema validation.
- Inline prompts appear outside `CONTEXT/library/packs/` or `CONTEXT/library/personas/`.

## References

- [OpenAI GPT-5 Prompting Guide](https://cookbook.openai.com/examples/gpt-5/gpt-5_prompting_guide)
- [Anthropic Claude Prompting Overview](https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/overview)
- [Google Gemini Prompting Strategies](https://ai.google.dev/gemini-api/docs/prompting-strategies)

## CI Gate

- Validator: `tools/prompts/validate-prompts.ts`
- Scope: `CONTEXT/library/{packs,personas,flows}/**/*.{yaml,yml,json}`
- Fails on:
  - Missing any of the 10 blocks.
  - Wrong block order.
  - Missing inputs/outputs schema files.
  - Nonconforming YAML/JSON structure.
- Warnings:
  - Missing `a11y_flags`.
