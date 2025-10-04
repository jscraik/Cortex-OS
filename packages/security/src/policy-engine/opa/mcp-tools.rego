package mcp.tools

import rego.v1

# MCP-specific tool authorization policies for brAInwav zero-trust

default allow := false
default require_sandbox := false

# Tool-specific authorization rules
allow if {
    input.tool_name in safe_tools
    valid_mcp_session
    within_rate_limits
}

allow if {
    input.tool_name in medium_risk_tools
    valid_mcp_session
    within_rate_limits
    has_required_capabilities
}

allow if {
    input.tool_name in high_risk_tools
    valid_mcp_session
    within_rate_limits
    has_required_capabilities
    sandbox_available
}

# MCP session validation
valid_mcp_session if {
    input.mcp_session.authenticated == true
    input.mcp_session.session_id
    session_age_seconds < 3600  # 1 hour max session
}

session_age_seconds := age if {
    now := time.now_ns() / 1000000000
    age := now - input.mcp_session.created_at
}

# Rate limiting
within_rate_limits if {
    input.tool_name in safe_tools
    input.usage.calls_per_minute < 60
}

within_rate_limits if {
    input.tool_name in medium_risk_tools
    input.usage.calls_per_minute < 30
}

within_rate_limits if {
    input.tool_name in high_risk_tools
    input.usage.calls_per_minute < 10
}

# Capability requirements
has_required_capabilities if {
    input.tool_name in safe_tools
    # No special capabilities required for safe tools
}

has_required_capabilities if {
    input.tool_name in medium_risk_tools
    some capability in input.capabilities
    capability.action == sprintf("invoke:tool.%s", [input.tool_name])
    capability.max_cost >= estimated_cost
}

has_required_capabilities if {
    input.tool_name in high_risk_tools
    some capability in input.capabilities
    capability.action == sprintf("invoke:tool.%s", [input.tool_name])
    capability.max_cost >= estimated_cost
    capability.attestations.security_review == true
}

# Sandbox requirements
require_sandbox if {
    input.tool_name in high_risk_tools
}

require_sandbox if {
    input.tool_name in medium_risk_tools
    contains(input.tool_args.path, "/")  # File system operations
}

sandbox_available if {
    input.sandbox.enabled == true
    input.sandbox.type in ["gvisor", "firecracker", "kata"]
}

sandbox_available if {
    not require_sandbox
}

# Cost estimation
estimated_cost := 0.01 if {
    input.tool_name in safe_tools
}

estimated_cost := 0.05 if {
    input.tool_name in medium_risk_tools
}

estimated_cost := 0.20 if {
    input.tool_name in high_risk_tools
}

# Tool categorization
safe_tools := [
    "memory_search",
    "text_analysis", 
    "code_search",
    "documentation_lookup",
    "syntax_check"
]

medium_risk_tools := [
    "file_read",
    "directory_list",
    "git_status",
    "database_query",
    "api_call",
    "test_run"
]

high_risk_tools := [
    "file_write",
    "file_delete", 
    "shell_command",
    "code_execution",
    "system_command",
    "container_operation",
    "network_access"
]

# Tenant-specific overrides
allow if {
    input.mcp_session.tenant == "brainwav-internal"
    input.tool_name in internal_tools
    valid_mcp_session
    within_rate_limits
}

internal_tools := [
    "internal_metrics",
    "debug_tools",
    "admin_commands"
]

# Time-based restrictions
allow if {
    input.tool_name in time_restricted_tools
    business_hours
    valid_mcp_session
    within_rate_limits
    has_required_capabilities
}

business_hours if {
    hour := (time.now_ns() / 1000000000) % 86400 / 3600
    hour >= 6   # 6 AM
    hour < 22   # 10 PM
}

time_restricted_tools := [
    "production_deploy",
    "database_migration",
    "system_restart"
]

# Resource-based restrictions
allow if {
    not contains(input.tool_args.path, "production")
    not contains(input.tool_args.path, "sensitive")
    # More permissive for non-production resources
    valid_mcp_session
    within_rate_limits
}

# Audit requirements
audit_required if {
    input.tool_name in high_risk_tools
}

audit_required if {
    input.tool_name in medium_risk_tools
    require_sandbox
}

audit_required if {
    contains(input.tool_args.path, "production")
}

audit_required if {
    contains(input.tool_args.path, "sensitive")
}

# Warning generation
warnings contains "Tool requires sandbox execution" if {
    require_sandbox
    not sandbox_available
}

warnings contains "High-risk tool usage outside business hours" if {
    input.tool_name in high_risk_tools
    not business_hours
}

warnings contains "Production resource access detected" if {
    contains(input.tool_args.path, "production")
}

warnings contains "Approaching rate limit" if {
    rate_utilization > 80
}

rate_utilization := (input.usage.calls_per_minute / rate_limit) * 100 if {
    input.tool_name in safe_tools
    rate_limit := 60
}

rate_utilization := (input.usage.calls_per_minute / rate_limit) * 100 if {
    input.tool_name in medium_risk_tools
    rate_limit := 30
}

rate_utilization := (input.usage.calls_per_minute / rate_limit) * 100 if {
    input.tool_name in high_risk_tools
    rate_limit := 10
}

# Denial reasons
reason := "Tool not in allowed list" if {
    not input.tool_name in safe_tools
    not input.tool_name in medium_risk_tools
    not input.tool_name in high_risk_tools
}

reason := "Invalid MCP session" if {
    not valid_mcp_session
}

reason := "Rate limit exceeded" if {
    valid_mcp_session
    not within_rate_limits
}

reason := "Missing required capabilities" if {
    valid_mcp_session
    within_rate_limits
    not has_required_capabilities
}

reason := "Sandbox required but unavailable" if {
    valid_mcp_session
    within_rate_limits
    has_required_capabilities
    require_sandbox
    not sandbox_available
}

reason := "Tool restricted outside business hours" if {
    input.tool_name in time_restricted_tools
    not business_hours
}
