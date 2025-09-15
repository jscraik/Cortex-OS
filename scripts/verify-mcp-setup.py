#!/usr/bin/env python3
"""
MCP Setup Verification Script
Checks the status of MCP integration across all packages and apps
"""

import os
import sys
from pathlib import Path

# Define the workspace root
WORKSPACE_ROOT = Path(__file__).parent.parent

# Define packages and apps that should have MCP integration
MCP_PACKAGES = [
    "mcp-core",
    "mcp-bridge",
    "mcp-registry",
    "cortex-mcp",
    "asbr",
    "prp-runner",
    "tdd-coach",
    "agents",
    "model-gateway",
    "kernel",
]

MCP_APPS = ["cortex-code", "cortex-marketplace", "cortex-os"]

MISSING_MCP_PACKAGES = [
    "memories",
    "rag",
    "security",
    "observability",
    "a2a",
    "a2a-services",
    "gateway",
    "evals",
    "simlab",
    "orchestration",
]

MISSING_MCP_APPS = ["cortex-py", "cortex-webui", "api"]


def check_package_mcp_integration(package_name):
    """Check if a package has MCP integration"""
    package_path = WORKSPACE_ROOT / "packages" / package_name

    if not package_path.exists():
        return False, "Package directory not found"

    # Check for MCP-related files
    mcp_indicators = [
        "mcp",
        "MCP",
        "tools.ts",
        "server.ts",
        "client.ts",
        "mcp-client",
        "mcp-server",
    ]

    has_mcp_files = False
    for root, dirs, files in os.walk(package_path):
        for file in files:
            if any(indicator in file for indicator in mcp_indicators):
                has_mcp_files = True
                break
        if has_mcp_files:
            break

    return has_mcp_files, "MCP files found" if has_mcp_files else "No MCP files found"


def check_app_mcp_integration(app_name):
    """Check if an app has MCP integration"""
    app_path = WORKSPACE_ROOT / "apps" / app_name

    if not app_path.exists():
        return False, "App directory not found"

    # Check for MCP-related files or commands
    mcp_indicators = ["mcp", "MCP", "mcp-client", "mcp-server", "mcp-types"]

    has_mcp_files = False
    for root, dirs, files in os.walk(app_path):
        for file in files:
            if any(indicator in file for indicator in mcp_indicators):
                has_mcp_files = True
                break
        if has_mcp_files:
            break

    # For cortex-code, also check for MCP CLI commands
    if app_name == "cortex-code":
        main_rs_path = app_path / "cli" / "src" / "main.rs"
        if main_rs_path.exists():
            content = main_rs_path.read_text()
            if "McpCli" in content or "mcp" in content.lower():
                has_mcp_files = True

    return has_mcp_files, "MCP files found" if has_mcp_files else "No MCP files found"


def main():
    """Main verification function"""
    print("🔍 MCP Integration Status Verification")
    print("=" * 50)

    # Track status
    integrated_packages = []
    missing_packages = []
    integrated_apps = []
    missing_apps = []

    # Check packages with existing MCP integration
    print("\n✅ Packages with MCP Integration:")
    for package in MCP_PACKAGES:
        has_mcp, message = check_package_mcp_integration(package)
        status = "✅" if has_mcp else "❌"
        print(f"  {status} {package:<20} - {message}")
        if has_mcp:
            integrated_packages.append(package)
        else:
            missing_packages.append(package)

    # Check packages missing MCP integration
    print("\n❌ Packages Missing MCP Integration:")
    for package in MISSING_MCP_PACKAGES:
        has_mcp, message = check_package_mcp_integration(package)
        status = "✅" if has_mcp else "❌"
        print(f"  {status} {package:<20} - {message}")
        if has_mcp:
            integrated_packages.append(package)
        else:
            missing_packages.append(package)

    # Check apps with existing MCP integration
    print("\n✅ Apps with MCP Integration:")
    for app in MCP_APPS:
        has_mcp, message = check_app_mcp_integration(app)
        status = "✅" if has_mcp else "❌"
        print(f"  {status} {app:<20} - {message}")
        if has_mcp:
            integrated_apps.append(app)
        else:
            missing_apps.append(app)

    # Check apps missing MCP integration
    print("\n❌ Apps Missing MCP Integration:")
    for app in MISSING_MCP_APPS:
        has_mcp, message = check_app_mcp_integration(app)
        status = "✅" if has_mcp else "❌"
        print(f"  {status} {app:<20} - {message}")
        if has_mcp:
            integrated_apps.append(app)
        else:
            missing_apps.append(app)

    # Summary
    total_packages = len(MCP_PACKAGES) + len(MISSING_MCP_PACKAGES)
    total_apps = len(MCP_APPS) + len(MISSING_MCP_APPS)
    integrated_package_count = len(integrated_packages)
    integrated_app_count = len(integrated_apps)

    print("\n📊 Summary:")
    print(
        f"  Packages: {integrated_package_count}/{total_packages} have MCP integration"
    )
    print(f"  Apps: {integrated_app_count}/{total_apps} have MCP integration")
    print(
        f"  Overall: {integrated_package_count + integrated_app_count}/{total_packages + total_apps} components integrated"
    )

    # Calculate percentage
    if total_packages + total_apps > 0:
        percentage = (
            (integrated_package_count + integrated_app_count)
            / (total_packages + total_apps)
            * 100
        )
        print(f"  Progress: {percentage:.1f}% complete")

    # Recommendations
    if missing_packages or missing_apps:
        print("\n💡 Recommendations:")
        if missing_packages:
            print(f"  - Implement MCP integration for {len(missing_packages)} packages")
        if missing_apps:
            print(f"  - Implement MCP integration for {len(missing_apps)} apps")
        print("  - Refer to MCP_TDD_PLAN.md for implementation guidance")
        print("  - Use the Makefile commands for standardized development")

    return 0


if __name__ == "__main__":
    sys.exit(main())
