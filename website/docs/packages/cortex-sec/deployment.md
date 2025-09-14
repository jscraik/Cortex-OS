---
title: Deployment
sidebar_label: Deployment
---

# Deployment Guides

Add to CI pipelines:

```yaml
- run: semgrep --config packages/cortex-sec/rulesets/semgrep/cortex-aggregate.yml --json &gt; reports/security.json
- run: node packages/cortex-sec/src/reporters/semgrep-parse.js reports/security.json &gt; reports/findings.json
- run: node packages/cortex-sec/scripts/check-policy.js reports/findings.json
```

Use containers or host runners with `semgrep` installed.
