---
title: Deployment
sidebar_label: Deployment
---

# Deployment

SimLab is designed for local and CI environments. Typical deployment involves adding the `simlab` commands to your CI pipeline:

```yaml
- name: Run SimLab Smoke Tests
  run: pnpm simlab:smoke
- name: Check Quality Gates
  run: pnpm simlab:report
```

No server deployment is required.

