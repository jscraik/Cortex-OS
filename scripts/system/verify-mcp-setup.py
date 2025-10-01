#!/usr/bin/env python3
"""
MCP Integration Verification Script
Checks the status of MCP integration across all Cortex-OS packages and apps.
"""

from pathlib import Path
from typing import Any, Dict, Tuple

# Constants
TS_PATTERN = "**/*.ts"
NOT_STARTED = "Not Started"
COMPLETE = "Complete"
PARTIAL = "Partial"
NOT_FOUND = "Not Found"
MINIMAL = "Minimal"


def check_tool_content(file_path: Path) -> bool:
    """Check if a file contains tool implementations."""
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            content = f.read()
            # Look for actual tool definitions
            if any(
                keyword in content
                for keyword in ["createTool", "defineTool", "ToolDefinition"]
            ):
                return True
            # For TypeScript files, look for tool exports
            if (
                file_path.suffix == ".ts"
                and "export" in content
                and ("tool" in content.lower() or "Tool" in content)
            ):
                return True
            # For Python files, look for tool definitions
            if (
                file_path.suffix == ".py"
                and "def " in content
                and "tool" in content.lower()
            ):
                return True
            # For Rust files, look for tool definitions
            if file_path.suffix == ".rs" and (
                "impl McpTool" in content
                or "trait McpTool" in content
                or "struct.*Tool" in content
            ):
                return True
    except (IOError, OSError, UnicodeDecodeError):
        pass
    return False


def check_mcp_client_usage(package_path: Path) -> bool:
    """Check for MCP client imports/usage in source files."""
    try:
        src_files = list(package_path.rglob("src/**/*.ts"))
        for src_file in src_files:
            with open(src_file, "r", encoding="utf-8") as f:
                content = f.read()
                if "MCP" in content and ("import" in content or "from" in content):
                    return True
    except (IOError, OSError, UnicodeDecodeError):
        pass
    return False


def check_app_specific_features(app: str, app_path: Path) -> Dict[str, bool]:
    """Check for app-specific MCP features."""
    features = {
        "has_mcp_gateway": False,
        "has_mcp_client": False,
        "has_mcp_marketplace": False,
    }

    if app == "cortex-os":
        # Check for MCP gateway usage
        try:
            src_files = list(app_path.rglob("src/**/*.ts"))
            for src_file in src_files:
                with open(src_file, "r", encoding="utf-8") as f:
                    content = f.read()
                    if "MCPGateway" in content or "provideMCP" in content:
                        features["has_mcp_gateway"] = True
                        break
        except (IOError, OSError, UnicodeDecodeError):
            pass

    elif app == "cortex-code":
        # Check for MCP client
        mcp_client_path = app_path / "mcp-client"
        if mcp_client_path.exists():
            features["has_mcp_client"] = True

    elif app == "cortex-marketplace":
        # Check for MCP references
        try:
            src_files = list(app_path.rglob(TS_PATTERN))
            for src_file in src_files:
                with open(src_file, "r", encoding="utf-8") as f:
                    content = f.read()
                    if "MCP" in content or "mcp" in content:
                        features["has_mcp_marketplace"] = True
                        break
        except (IOError, OSError, UnicodeDecodeError):
            pass

    return features


def check_package_mcp_integration(package: str, base_path: Path) -> Dict[str, Any]:
    """Check MCP integration for a single package."""
    package_path = Path(base_path) / "packages" / package

    if not package_path.exists():
        return {
            "has_mcp_files": False,
            "has_tools": False,
            "has_mcp_client": False,
            "status": NOT_FOUND,
        }

    # Check for MCP files
    mcp_files = list(package_path.rglob("mcp/**/*"))
    tool_files = (
        list(package_path.rglob("*/tools.ts"))
        + list(package_path.rglob("*/tools.py"))
        + list(package_path.rglob("*/tools.rs"))
    )
    has_mcp_files = len(mcp_files) > 0 or len(tool_files) > 0

    # Check for actual tool implementations
    has_tools = any(check_tool_content(tool_file) for tool_file in tool_files)

    # Special case for orchestration - check for MCP client usage
    has_mcp_client = False
    if package == "orchestration":
        has_mcp_client = check_mcp_client_usage(package_path)

    # Special cases for core MCP packages
    if package in ["cortex-mcp", "mcp-core"]:
        has_mcp_files = len(list(package_path.rglob(TS_PATTERN))) > 0

    # Determine status based on implementation level
    if has_tools:
        status = COMPLETE
    elif has_mcp_client or has_mcp_files:
        status = PARTIAL
    else:
        status = NOT_STARTED

    return {
        "has_mcp_files": has_mcp_files,
        "has_tools": has_tools,
        "has_mcp_client": has_mcp_client,
        "status": status,
    }


def check_app_mcp_integration(app: str, base_path: Path) -> Dict[str, Any]:
    """Check MCP integration for a single app."""
    app_path = Path(base_path) / "apps" / app

    if not app_path.exists():
        return {
            "has_mcp_files": False,
            "has_tools": False,
            "has_mcp_gateway": False,
            "has_mcp_client": False,
            "has_mcp_marketplace": False,
            "status": NOT_FOUND,
        }

    # Check for MCP files
    mcp_files = list(app_path.rglob("mcp/**/*"))
    tool_files = (
        list(app_path.rglob("*/tools.ts"))
        + list(app_path.rglob("*/tools.py"))
        + list(app_path.rglob("*/tools.rs"))
    )
    has_mcp_files = len(mcp_files) > 0 or len(tool_files) > 0

    # Check for actual tool implementations
    has_tools = any(check_tool_content(tool_file) for tool_file in tool_files)

    # Check app-specific features
    features = check_app_specific_features(app, app_path)

    # Determine status based on implementation level
    if has_tools:
        status = COMPLETE
    elif any(features.values()):
        status = MINIMAL
    else:
        status = NOT_STARTED

    return {
        "has_mcp_files": has_mcp_files,
        "has_tools": has_tools,
        **features,
        "status": status,
    }


def check_mcp_integration(
    base_path: Path,
) -> Tuple[Dict[str, Dict[str, Any]], Dict[str, Dict[str, Any]]]:
    """Check MCP integration status for all packages and apps."""

    # Define packages and apps
    packages = [
        "mcp-core",
        "mcp-bridge",
        "mcp-registry",
        "cortex-mcp",
        "memories",
        "rag",
        "security",
        "observability",
        "gateway",
        "evals",
        "simlab",
        "asbr",
        "prp-runner",
        "tdd-coach",
        "agents",
        "model-gateway",
        "kernel",
        "orchestration",
        "a2a",
        "a2a-services",
    ]

    apps = [
        "cortex-code",
        "cortex-marketplace",
        "cortex-py",
        "cortex-webui",
        "api",
        "cortex-os",
    ]

    # Check packages
    package_status = {
        package: check_package_mcp_integration(package, base_path)
        for package in packages
    }

    # Check apps
    app_status = {app: check_app_mcp_integration(app, base_path) for app in apps}

    return package_status, app_status


def print_packages_with_integration(package_status: Dict[str, Dict[str, Any]]) -> None:
    """Print packages with MCP integration."""
    print("\n✅ Packages with MCP Integration:")
    complete_packages = [
        pkg for pkg, status in package_status.items() if status["status"] == COMPLETE
    ]
    partial_packages = [
        pkg for pkg, status in package_status.items() if status["status"] == PARTIAL
    ]

    for package in complete_packages:
        print(f"  ✅ {package:<20} - MCP tools implemented")

    for package in partial_packages:
        print(f"  ⚠️  {package:<20} - Partial MCP integration")


def print_packages_with_tools(package_status: Dict[str, Dict[str, Any]]) -> None:
    """Print packages with actual tool implementations."""
    print("\n🔧 Packages with Actual MCP Tool Implementations:")
    tool_packages = [
        pkg
        for pkg, status in package_status.items()
        if status["has_tools"] or status["status"] == COMPLETE
    ]
    for package in tool_packages:
        if package_status[package]["status"] == COMPLETE:
            print(f"  ✅ {package:<20} - MCP tools implemented")
        elif package_status[package]["has_mcp_client"]:
            print(f"  ⚠️  {package:<20} - MCP client integration")


def print_missing_packages(package_status: Dict[str, Dict[str, Any]]) -> None:
    """Print packages missing MCP integration."""
    print("\n❌ Packages Missing MCP Integration:")
    missing_packages = [
        pkg
        for pkg, status in package_status.items()
        if status["status"] == NOT_STARTED or status["status"] == NOT_FOUND
    ]
    for package in missing_packages:
        reason = (
            "No MCP files found"
            if package_status[package]["status"] == NOT_STARTED
            else "Package not found"
        )
        print(f"  ❌ {package:<20} - {reason}")


def print_apps_with_integration(app_status: Dict[str, Dict[str, Any]]) -> None:
    """Print apps with MCP integration."""
    print("\n✅ Apps with MCP Integration:")
    complete_apps = [
        app for app, status in app_status.items() if status["status"] == COMPLETE
    ]
    minimal_apps = [
        app for app, status in app_status.items() if status["status"] == MINIMAL
    ]

    for app in complete_apps:
        print(f"  ✅ {app:<20} - MCP integration found")

    for app in minimal_apps:
        status_detail = ""
        if app_status[app]["has_mcp_client"]:
            status_detail = "MCP client found"
        elif app_status[app]["has_mcp_gateway"]:
            status_detail = "MCP gateway found"
        elif app_status[app]["has_mcp_marketplace"]:
            status_detail = "MCP marketplace integration"
        print(f"  ⚠️  {app:<20} - {status_detail}")


def print_apps_with_tools(app_status: Dict[str, Dict[str, Any]]) -> None:
    """Print apps with actual implementations."""
    print("\n🔧 Apps with Actual MCP Implementations:")
    tool_apps = [
        app
        for app, status in app_status.items()
        if status["has_tools"] or status["status"] in [COMPLETE, MINIMAL]
    ]
    for app in tool_apps:
        if app_status[app]["status"] == COMPLETE:
            print(f"  ✅ {app:<20} - MCP tools implemented")
        elif app_status[app]["has_mcp_client"]:
            print(f"  ⚠️  {app:<20} - MCP client implementation")
        elif app_status[app]["has_mcp_gateway"]:
            print(f"  ⚠️  {app:<20} - MCP gateway implementation")
        elif app_status[app]["has_mcp_marketplace"]:
            print(f"  ⚠️  {app:<20} - MCP marketplace integration")


def print_missing_apps(app_status: Dict[str, Dict[str, Any]]) -> None:
    """Print apps missing MCP integration."""
    print("\n❌ Apps Missing MCP Integration:")
    missing_apps = [
        app
        for app, status in app_status.items()
        if status["status"] == NOT_STARTED or status["status"] == NOT_FOUND
    ]
    for app in missing_apps:
        reason = (
            "No MCP files found"
            if app_status[app]["status"] == NOT_STARTED
            else "App not found"
        )
        print(f"  ❌ {app:<20} - {reason}")


def print_summary(
    package_status: Dict[str, Dict[str, Any]], app_status: Dict[str, Dict[str, Any]]
) -> None:
    """Print integration summary and recommendations."""
    total_packages = len(
        [
            pkg
            for pkg in package_status.keys()
            if package_status[pkg]["status"] != NOT_FOUND
        ]
    )
    integrated_packages = len(
        [pkg for pkg, status in package_status.items() if status["status"] == COMPLETE]
    )

    total_apps = len(
        [app for app in app_status.keys() if app_status[app]["status"] != NOT_FOUND]
    )
    integrated_apps = len(
        [app for app, status in app_status.items() if status["status"] == COMPLETE]
    )

    total_components = total_packages + total_apps
    integrated_components = integrated_packages + integrated_apps
    progress = (
        (integrated_components / total_components) * 100 if total_components > 0 else 0
    )

    print("\n📊 Summary:")
    print(f"  Packages: {integrated_packages}/{total_packages} have MCP integration")
    print(f"  Apps: {integrated_apps}/{total_apps} have MCP integration")
    print(
        f"  Overall: {integrated_components}/{total_components} components integrated"
    )
    print(f"  Progress: {progress:.1f}% complete")

    print("\n💡 Recommendations:")
    print(
        f"  - Implement MCP integration for {total_packages - integrated_packages} packages"
    )
    print(f"  - Implement MCP integration for {total_apps - integrated_apps} apps")
    print("  - Refer to MCP_TDD_PLAN.md for implementation guidance")
    print("  - Use the Makefile commands for standardized development")


def print_status_report(
    package_status: Dict[str, Dict[str, Any]], app_status: Dict[str, Dict[str, Any]]
) -> None:
    """Print a formatted status report."""
    print("🔍 MCP Integration Status Verification")
    print("=" * 47)

    print_packages_with_integration(package_status)
    print_packages_with_tools(package_status)
    print_missing_packages(package_status)
    print_apps_with_integration(app_status)
    print_apps_with_tools(app_status)
    print_missing_apps(app_status)
    print_summary(package_status, app_status)


if __name__ == "__main__":
    # Get the base path (script location)
    base_path = Path(__file__).parent.parent
    package_status, app_status = check_mcp_integration(base_path)
    print_status_report(package_status, app_status)
