---
name: Pull Request
about: Standard pull request template for Cortex-OS
title: '[AREA] Brief description of changes'
labels: ['needs-review']
assignees: ''
---

## 📋 Summary

<!-- Provide a brief summary of your changes -->

## 🗂 Task & Governance Links

- Task folder: <!-- Paste the direct link to `~/tasks/[feature]/` -->
- Code review checklist comment: <!-- Paste the URL of the top-level checklist comment -->
- Governance evidence pointers: <!-- List links to vibe-check logs, verification artifacts, and stored templates -->

## 🎯 Type of Change

- [ ] 🐛 Bug fix (non-breaking change which fixes an issue)
- [ ] ✨ New feature (non-breaking change which adds functionality)
- [ ] 💥 Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] 📝 Documentation update
- [ ] 🔧 Configuration/tooling change
- [ ] 🎨 Code style/formatting change
- [ ] ♻️ Refactoring (no functional changes)
- [ ] ⚡ Performance improvement
- [ ] 🔒 Security enhancement
- [ ] 🧪 Test addition or improvement

## 🔍 What Changed

### Core Changes

<!-- List the main changes made -->

-
-
-

### Files Modified

<!-- List key files that were modified -->

-
-
-

## 🧪 Testing

### Test Coverage

- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] E2E tests added/updated
- [ ] Manual testing completed

### Test Results

```bash
# Paste relevant test output here
```

### Security Testing

- [ ] Security scan passed (Semgrep)
- [ ] Dependency audit clean
- [ ] No SSRF vulnerabilities introduced
- [ ] Input validation implemented where needed

## 📖 Documentation

- [ ] Code is self-documenting with clear comments
- [ ] README updated (if applicable)
- [ ] API documentation updated (if applicable)
- [ ] Architecture diagrams updated (if applicable)
- [ ] Migration guide provided (for breaking changes)

## 🔗 Related Issues

<!-- Link to related issues using keywords like "Fixes", "Closes", "Addresses" -->

- Fixes #
- Addresses #
- Related to #

## 📸 Screenshots/Recordings

<!-- For UI changes, include before/after screenshots or recordings -->

## 🚀 Deployment Notes

<!-- Any special deployment instructions or considerations -->

### Environment Variables

<!-- List any new environment variables needed -->

### Database Changes

<!-- Describe any database migrations or schema changes -->

### Configuration Changes

<!-- Note any configuration file changes needed -->

## ✅ Pre-submission Checklist

### Code Quality

- [ ] Code follows project style guidelines (ESLint/Prettier)
- [ ] TypeScript types are properly defined
- [ ] No console.log statements left in production code
- [ ] Error handling is comprehensive
- [ ] Performance impact considered

### Security

- [ ] No hardcoded secrets or sensitive data
- [ ] User inputs are validated and sanitized
- [ ] Authentication/authorization properly implemented
- [ ] External APIs called securely (SSRF protection)

### Architecture

- [ ] Changes follow ASBR architectural patterns
- [ ] Feature packages communicate via A2A events
- [ ] No direct imports between feature packages
- [ ] MCP integrations follow established patterns

### Testing & Documentation

- [ ] All tests pass locally
- [ ] Code coverage maintained/improved
- [ ] Documentation is accurate and up-to-date
- [ ] Changelog updated (if applicable)

## 👥 Reviewer Guidance

### Focus Areas

<!-- Guide reviewers on what to pay special attention to -->

-
-
-

### Questions for Reviewers

<!-- Specific questions you'd like reviewers to consider -->

-
-
-

## 🏃‍♂️ Post-Merge Tasks

<!-- Tasks to complete after merge -->

- [ ] Monitor deployment
- [ ] Update dependent services
- [ ] Notify stakeholders
- [ ] Update project board

---

**Reviewers:** Please ensure all checklist items are completed before approving.

**Security Note:** This PR has been scanned for security vulnerabilities. Any new security findings should be addressed before merge.
