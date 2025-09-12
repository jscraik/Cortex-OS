# FAQ

**Why does `check-policy` fail?**
Thresholds were exceeded. Adjust `POLICY_THRESHOLD_*` or fix the issues.

**How do I add a new rule?**
Create the rule under `rulesets/semgrep/` and reference it in `cortex-aggregate.yml`.

**Does the package upload data externally?**
No. All scans and processing run locally.
