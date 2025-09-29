---
name: daily-summary
description: Summarise today's brAInwav Cortex-OS progress for the team stand-up.
argument-hint: optional focus phrase (e.g. observability)
model: brAInwav-pro
allowed-tools:
  - Bash(git status:*)
  - Fs.read(docs/**)
---
# brAInwav Daily Summary

- **Focus**: $ARGUMENTS
- **Status**: !`git status --short`
- **Top Commits**: !`git log --pretty=format:"%h %s" -5`
- **Documentation updates**: !`rg --files -g"*.md" docs | head -n 5`

Remember to capture blockers and risks explicitly.
