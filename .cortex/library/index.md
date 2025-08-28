# Cortex OS Library System

## Structure Overview

- **packs/**: Tech stack templates and research prompts
- **rules/**: Core prompt specifications and behavioral rules
- **schemas/**: TypeScript/JSON schemas for validation
- **personas/**: Role-based configurations (analyst, architect, product)
- **blueprints/**: Architecture templates and patterns
- **flows/**: Workflow automation definitions
- **mcp/**: Model Context Protocol integrations

## Integration with Governance

This library system integrates with the governance structure:

- Schemas validate against `../schemas/`
- Rules enforce policies from `../policy/`
- Gates use validation from `../gates/`

## Usage

Library components are referenced by the governance system and can be used
directly by agents and automation tools.
