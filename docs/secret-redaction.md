# Secret Redaction & History Hygiene

Comprehensive procedure for responding to accidental secret commits.

## 1. Immediate Containment

1. Identify exposed values (grep or code scanning alerts).
2. Revoke/rotate externally (provider dashboard) BEFORE pushing any remediation.
3. Invalidate dependent sessions/tokens (CI, service accounts, webhooks).
4. Add temporary monitoring (audit logs, anomaly detection) for suspicious use.

## 2. Decision: Rewrite vs Forward Rotation

| Scenario                             | Recommended Action                                      |
| ------------------------------------ | ------------------------------------------------------- |
| Single recent commit, low fork count | History rewrite OK                                      |
| Widely forked / starred repo         | Prefer forward rotation only                            |
| Multiple secrets across many commits | Forward rotation + targeted filter-repo for worst cases |

Forward-only rotation is normally sufficient because leaked secrets must be assumed compromised permanently.

## 3. Forward Rotation Workflow

```bash
# 1. Rotate externally (Sonar, OpenAI, GitHub, etc.)
# 2. Remove values from tracked file (.env) leaving placeholders
# 3. Commit
git add .env
git commit -m "chore(security): scrub secrets from .env (rotated)"
# 4. Push and confirm CI passes
```

## 4. History Rewrite (If Approved)

> Coordinate with maintainers; force pushes disrupt collaborators.

### Using git filter-repo (preferred)

```bash
pip install git-filter-repo
# Mirror clone
git clone --mirror git@github.com:ORG/REPO.git repo-mirror
cd repo-mirror
# Remove file containing secrets
git filter-repo --path .env --invert-paths
# Or replace secret strings inline (example)
# git filter-repo --replace-text replacements.txt

# Force push
git push --force
```

`replacements.txt` format:

```text
5005a2cd7edcb3d05f14b21eae1a0a861ea33e99==REDACTED_SONAR_TOKEN
sk-.*==REDACTED_OPENAI_KEY
```

### Using BFG Repo Cleaner (alternative)

```bash
java -jar bfg.jar --replace-text replacements.txt REPO.git
cd REPO.git
git reflog expire --expire=now --all
git gc --prune=now --aggressive
git push --force
```

## 5. Post-Redaction Validation

```bash
gitleaks detect --redact --no-git || true
bash scripts/quality/pattern-guard.sh --staged || true
rg "sk-" -n || true
```

Checklist:

- [ ] All old tokens revoked
- [ ] New tokens stored in secret manager only
- [ ] CI secrets updated (if rotated)
- [ ] SARIF/code scanning clear
- [ ] README / docs updated if process changed

## 6. Prevent Recurrence

- Enable pre-commit secret scanning (pattern-guard + optional gitleaks hook).
- Add high-entropy + provider-specific regex (done in `pattern-guard.sh`).
- Educate contributors: never commit real values—use placeholders.
- Consider commit signing + provenance to trace leaks faster.

## 7. Communication Template

```text
Subject: Secret Exposure Remediation Completed

We detected accidental inclusion of <SECRET TYPE>. Immediate actions:
- Rotated and revoked affected credentials
- Scrubbed repository state (forward rotation / history rewrite)
- Added enhanced scanning rules

No evidence of malicious use as of <TIMESTAMP>. Monitoring continues.
```

## 8. Tooling References

| Need                  | Tool                    |
| --------------------- | ----------------------- |
| Broad codebase scan   | gitleaks                |
| Targeted pattern scan | ripgrep / pattern-guard |
| Rewrite history       | git filter-repo / BFG   |
| Secret entropy hints  | trufflehog / gitleaks   |

---

Maintain this playbook as new providers and token formats appear.
