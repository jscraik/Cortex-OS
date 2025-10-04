package brainwav.security

default allow = false

default audit_required = false

default violation_reason = "policy.no_valid_capability"

capability_matches if {
  some i
  cap := input.capabilities[i]
  cap.tenant == input.tenant
  cap.action == input.action
  startswith(input.resource, cap.resource_prefix)
  not cap.revoked
  cost_condition(cap)
}

cost_condition(cap) if {
  not cap.max_cost
}

cost_condition(cap) if {
  cap.max_cost
  input.request_cost <= cap.max_cost
}

req_limit_ok if {
  not input.budget
}

req_limit_ok if {
  input.budget
  not input.budget.max_total_req
}

req_limit_ok if {
  input.budget
  input.budget.max_total_req
  input.current_usage.total_req + input.request_units <= input.budget.max_total_req
}

duration_limit_ok if {
  not input.budget
}

duration_limit_ok if {
  input.budget
  not input.budget.max_total_duration_ms
}

duration_limit_ok if {
  input.budget
  input.budget.max_total_duration_ms
  input.current_usage.total_duration_ms + input.request_duration_ms <= input.budget.max_total_duration_ms
}

cost_limit_ok if {
  not input.budget
}

cost_limit_ok if {
  input.budget
  not input.budget.max_total_cost
}

cost_limit_ok if {
  input.budget
  input.budget.max_total_cost
  input.current_usage.total_cost + input.request_cost <= input.budget.max_total_cost
}

budget_ok if {
  req_limit_ok
  duration_limit_ok
  cost_limit_ok
}

allow if {
  capability_matches
  budget_ok
}

audit_required if {
  allow
  input.requires_audit
}

violation_reason := "policy.duration_exceeded" if {
  capability_matches
  not duration_limit_ok
}

violation_reason := "policy.cost_exceeded" if {
  capability_matches
  duration_limit_ok
  not cost_limit_ok
}

violation_reason := "policy.request_limit_exceeded" if {
  capability_matches
  duration_limit_ok
  cost_limit_ok
  not req_limit_ok
}

violation_reason := "policy.allow" if {
  allow
}

result := {
  "allow": allow,
  "reason": violation_reason,
  "audit_required": audit_required,
  "warnings": input.warnings,
  "metadata": {
    "policy_version": input.policy_version,
    "policy_hash": input.policy_hash,
  }
}

