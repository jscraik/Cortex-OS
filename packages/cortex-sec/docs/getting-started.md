# Getting Started

## Prerequisites

- Node.js 18+
- pnpm
- [Semgrep](https://semgrep.dev) CLI

## Installation

```bash
pnpm add -D @cortex-os/cortex-sec
```

## First Scan

```bash
# run semgrep with Cortex rules
semgrep --config packages/cortex-sec/rulesets/semgrep/cortex-aggregate.yml --json > reports/security.json
# parse results into normalized findings
node packages/cortex-sec/src/reporters/semgrep-parse.js reports/security.json > reports/findings.json
# enforce policy thresholds
node packages/cortex-sec/scripts/check-policy.js reports/findings.json
```
