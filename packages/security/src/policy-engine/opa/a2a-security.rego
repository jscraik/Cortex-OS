package a2a.security

import rego.v1

# Default deny - zero trust principle
default allow := false
default audit_required := false
default warnings := []

# Main authorization decision
allow if {
    input.authn.valid == true
    valid_capability_exists
    budget_check_passes
    risk_assessment_passes
    not requires_attestation_but_missing
}

# Capability validation
valid_capability_exists if {
    some capability in input.capabilities
    capability_matches_request(capability)
    not capability.revoked
}

capability_matches_request(capability) if {
    capability.action == input.action
    startswith(input.resource, capability.resource_prefix)
    capability.tenant == input.tenant
}

# Budget enforcement
budget_check_passes if {
    input.budget
    input.current_usage.total_req < input.budget.max_total_req
    input.current_usage.total_cost + input.request_cost <= input.budget.max_total_cost
}

budget_check_passes if {
    not input.budget  # No budget defined, allow
}

# Risk assessment
risk_assessment_passes if {
    risk_score < 50  # Low/medium risk threshold
}

risk_assessment_passes if {
    risk_score >= 50
    risk_score < 80
    has_required_attestations  # Medium risk requires attestations
}

risk_assessment_passes if {
    risk_score >= 80
    has_required_attestations
    input.action in safe_high_risk_actions  # Only specific high-risk actions allowed
}

# Risk scoring
risk_score := score if {
    base_score := action_risk_score + resource_risk_score + context_risk_score
    score := min([base_score, 100])
}

action_risk_score := 70 if {
    input.action in ["invoke:tool.shell", "invoke:tool.code-execution"]
}

action_risk_score := 50 if {
    input.action in ["invoke:tool.file-write", "invoke:tool.network-request"]
}

action_risk_score := 30 if {
    input.action in ["invoke:tool.file-read", "invoke:tool.database-query"]
}

action_risk_score := 10 if {
    not input.action in high_risk_actions
    not input.action in medium_risk_actions
    not input.action in low_risk_actions
}

resource_risk_score := 20 if {
    contains(input.resource, "sensitive")
}

resource_risk_score := 15 if {
    contains(input.resource, "production")
}

resource_risk_score := 5 if {
    not contains(input.resource, "sensitive")
    not contains(input.resource, "production")
}

context_risk_score := 15 if {
    time.now_ns() / 1000000000 % 86400 < 21600  # Off hours (before 6 AM)
}

context_risk_score := 15 if {
    time.now_ns() / 1000000000 % 86400 > 79200  # Off hours (after 10 PM)
}

context_risk_score := 0 if {
    hour := time.now_ns() / 1000000000 % 86400
    hour >= 21600
    hour <= 79200
}

# Attestation requirements
requires_attestation_but_missing if {
    risk_score >= 50
    not has_required_attestations
}

has_required_attestations if {
    input.attestations.code_review_passed == true
    input.action in ["invoke:tool.shell", "invoke:tool.code-execution"]
}

has_required_attestations if {
    input.action in ["invoke:tool.file-write", "invoke:tool.network-request"]
    # File/network operations don't require code review for now
}

has_required_attestations if {
    not input.action in ["invoke:tool.shell", "invoke:tool.code-execution"]
    not input.action in ["invoke:tool.file-write", "invoke:tool.network-request"]
}

# Audit requirements
audit_required if {
    risk_score >= 30
}

audit_required if {
    input.action in ["invoke:tool.shell", "invoke:tool.code-execution", "invoke:tool.file-write"]
}

audit_required if {
    contains(input.resource, "sensitive")
}

# Warning generation
warnings contains "High risk operation - manual review recommended" if {
    risk_score >= 70
}

warnings contains "Off-hours access detected" if {
    context_risk_score > 0
}

warnings contains "Approaching budget limit" if {
    input.budget
    budget_utilization := (input.current_usage.total_cost / input.budget.max_total_cost) * 100
    budget_utilization > 80
}

warnings contains "No attestations provided for medium-risk operation" if {
    risk_score >= 50
    risk_score < 80
    not has_required_attestations
}

# Action categories
high_risk_actions := [
    "invoke:tool.shell",
    "invoke:tool.code-execution",
    "invoke:tool.system-command"
]

medium_risk_actions := [
    "invoke:tool.file-write",
    "invoke:tool.network-request",
    "invoke:tool.database-write",
    "invoke:tool.container-operation"
]

low_risk_actions := [
    "invoke:tool.file-read",
    "invoke:tool.database-query",
    "invoke:tool.memory-search",
    "invoke:tool.text-analysis"
]

safe_high_risk_actions := [
    "invoke:tool.shell",      # Allowed if properly attested
    "invoke:tool.code-execution"  # Allowed if properly attested
]

# Tenant-specific policies
allow if {
    input.tenant == "brainwav-admin"
    valid_capability_exists
    # Admin tenant gets elevated privileges
}

# Development overrides (only in non-production)
allow if {
    input.tenant == "development"
    valid_capability_exists
    not contains(input.resource, "production")
    not contains(input.resource, "sensitive")
}

# Reason generation for denials
reason := "Invalid or missing capabilities" if {
    not valid_capability_exists
}

reason := "Budget exceeded" if {
    valid_capability_exists
    not budget_check_passes
}

reason := "Risk assessment failed - attestations required" if {
    valid_capability_exists
    budget_check_passes
    not risk_assessment_passes
    requires_attestation_but_missing
}

reason := "Risk assessment failed - operation not permitted" if {
    valid_capability_exists
    budget_check_passes
    not risk_assessment_passes
    not requires_attestation_but_missing
    risk_score >= 80
    not input.action in safe_high_risk_actions
}

reason := "Authentication invalid" if {
    input.authn.valid != true
}

reason := "Access denied by policy" if {
    input.authn.valid == true
    valid_capability_exists
    budget_check_passes
    risk_assessment_passes
    not requires_attestation_but_missing
    not allow  # Catch-all for other denials
}
