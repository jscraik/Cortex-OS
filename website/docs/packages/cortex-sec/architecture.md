---
title: Architecture
sidebar_label: Architecture
---

# Architecture

- **Rulesets** - Semgrep definitions for JS/TS and Python (`rulesets/semgrep`).
- **Reporter** - `src/reporters/semgrep-parse.js` normalizes Semgrep JSON.
- **Policy Checker** - `scripts/check-policy.js` enforces severity thresholds.
- **Config Maps** - `config/` links findings to ATLAS and OWASP taxonomies.
