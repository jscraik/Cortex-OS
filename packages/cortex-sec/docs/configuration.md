# Configuration

## Rulesets

- JavaScript/TypeScript and Python Semgrep rules live in `rulesets/semgrep/`.

## Maps

- OWASP mapping: `config/owasp-map.yaml`
- ATLAS mapping: `config/atlas-map.yaml`

## Policy Thresholds

Set counts via environment variables or CLI flags:

- `POLICY_THRESHOLD_HIGH` (default 0)
- `POLICY_THRESHOLD_MEDIUM` (default 10)
- `POLICY_THRESHOLD_LOW` (default 9999)
