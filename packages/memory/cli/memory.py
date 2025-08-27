"""
file_path: cli/src/cortex_cli/tools/commands/memory_commands.py
description: Modular handlers and helpers for /memory commands (view, clear, persist).
maintainer: @jamiescottcraik
last_updated: 2025-08-08
version: 1.0.0
status: active
ai_generated_by: GitHub Copilot
ai_provenance_hash: N/A
"""

# © 2025 brAInwav LLC — every line reduces barriers, enhances security, and supports resilient AI engineering.
from __future__ import annotations

from collections.abc import Callable
from pathlib import Path
from typing import Any

try:  # pragma: no cover - optional rich import
    from rich.table import Table  # type: ignore
    from rich.tree import Tree  # type: ignore
except Exception:  # pragma: no cover - fallback no-op stubs
    class Table:  # type: ignore
        def __init__(self, *a, **k):
            pass
        def add_column(self, *a, **k):
            pass
        def add_row(self, *a, **k):
            pass
    class Tree:  # type: ignore
        def __init__(self, *a, **k):
            pass
        def add(self, *a, **k):
            return self


Guard = Callable[[str, str], dict]


def handle_memory(proc, args: list[str], guard: Guard | None = None) -> bool:
    """Entry point for /memory command, delegating to helpers.

    Args:
        proc: SlashCommandProcessor instance for context (console, config, confirm).
        args: CLI args after the command.
        guard: Optional guard callable(description, preview) -> {executed: bool} for destructive ops.
    """
    if not args:
        show_memory_overview(proc)
        return True

    sub = args[0]
    if sub == "view":
        scope = args[1] if len(args) > 1 else "global"
        show_memory_scope(proc, scope)
        return True
    if sub == "clear":
        scope = args[1] if len(args) > 1 else "session"
        clear_memory_scope(proc, scope, guard)
        return True
    if sub == "persist":
        key = args[1] if len(args) > 1 else None
        value = None
        scope = "global"
        if len(args) > 2:
            if args[-1] in ("session", "project", "global") and len(args) >= 4:
                scope = args[-1]
                value = " ".join(args[2:-1])
            else:
                value = " ".join(args[2:])
        if key and value is not None:
            persist_memory_item(proc, key, value, scope)
            return True
        proc.app.console.print("❌ [red]Usage: /memory persist <key> <value>[/red]")
        return False

    proc.app.console.print("❌ [red]Usage: /memory [view|clear|persist] [scope|key][/red]")
    return False


def show_memory_overview(proc) -> None:
    """Show memory overview across all scopes with file sizes and counts."""
    import json

    proc.app.console.print("🧠 [bold]Memory Overview[/bold]")

    memory_tree = Tree("💾 Memory Scopes")

    def _path(scope: str) -> Path:
        return get_memory_path(proc, scope)

    def _size_and_len(p: Path) -> tuple[str, int]:
        try:
            if not p.exists():
                return ("0B", 0)
            data = json.loads(p.read_text() or "{}")
            size_kb = max(1, int(p.stat().st_size / 1024))
            return (f"{size_kb}KB", len(data.keys()) if isinstance(data, dict) else 0)
        except Exception:
            return ("0B", 0)

    s_path = _path("session")
    s_size, s_len = _size_and_len(s_path)
    memory_tree.add(f"🔄 Session Memory (Current) — {s_size}, {s_len} items")

    g_path = _path("global")
    g_size, g_len = _size_and_len(g_path)
    memory_tree.add(f"🌍 Global Memory (Persistent) — {g_size}, {g_len} items")

    p_path = _path("project")
    p_size, p_len = _size_and_len(p_path)
    memory_tree.add(f"🏗️ Project Memory — {p_size}, {p_len} items")

    proc.app.console.print(memory_tree)


def show_memory_scope(proc, scope: str) -> None:
    """Show detailed view of items within a single scope."""
    proc.app.console.print(f"🧠 [bold]Memory Scope: {scope.title()}[/bold]")

    try:
        items = load_memory(proc, scope)
    except ValueError as e:
        items = {"error": str(e)}

    if "error" not in items:
        table = Table()
        table.add_column("Key", style="cyan")
        table.add_column("Value", style="green")
        table.add_column("Type", style="yellow")
        for key, value in items.items():
            value_type = type(value).__name__ if not isinstance(value, str) else "string"
            display_value = str(value)[:50] + "..." if len(str(value)) > 50 else str(value)
            table.add_row(key, display_value, value_type)
        proc.app.console.print(table)
    else:
        proc.app.console.print(f"❌ [red]{items['error']}[/red]")


def clear_memory_scope(proc, scope: str, guard: Guard | None = None) -> None:
    """Clear a memory scope with an optional external guard function."""
    # Use external guard when provided (e.g., PermissionEngine.guard_write)
    if guard is not None:
        result = guard(f"Clear {scope} memory scope", f"This will permanently delete all data in {scope} memory scope")
        if not result.get("executed", False):
            return

    if proc._confirm(f"⚠️ Clear all {scope} memory? This cannot be undone."):
        try:
            save_memory(proc, scope, {})
            proc.app.console.print(f"🗑️ [green]Cleared {scope} memory scope[/green]")
        except ValueError as e:
            proc.app.console.print(f"❌ [red]{e}[/red]")
    else:
        proc.app.console.print("❌ [yellow]Memory clear cancelled[/yellow]")


def persist_memory_item(proc, key: str, value: str, scope: str = "global") -> None:
    """Persist a memory item to a scope with quotas and redaction."""
    if getattr(proc, "app", None) and getattr(proc.app, "permission_mode", None) in ("plan", "ask"):
        if not proc._confirm(f"Persist '{key}' to {scope} memory?"):
            proc.app.console.print("❌ [yellow]Persist cancelled[/yellow]")
            return

    sensitive = {"api_key", "token", "secret", "password"}
    store_key = "[redacted]" if any(sk in key.lower() for sk in sensitive) else key

    data = load_memory(proc, scope)
    data[store_key] = value

    path = get_memory_path(proc, scope)
    if path.exists() and path.stat().st_size > (1024 * 1024 * (1 if scope == "session" else 5)):
        proc.app.console.print("⚠️ [yellow]Memory quota exceeded; item not persisted[/yellow]")
        return

    save_memory(proc, scope, data)
    proc.app.console.print(f"💾 [green]Persisted '{store_key}' to {scope} memory[/green]")


def get_memory_path(proc, scope: str) -> Path:
    scope = scope.lower()
    if scope == "session":
        try:
            return proc.app.config.get_session_log_dir(proc.app.session_id) / "memory.json"
        except Exception:
            base = Path.home() / ".cortex" / "logs" / "sessions" / "default"
            base.mkdir(parents=True, exist_ok=True)
            return base / "memory.json"
    if scope == "global":
        return proc.app.config.memory_file
    if scope == "project":
        return proc.app.config.config_dir / "project-memory.json"
    raise ValueError(f"Unknown scope: {scope}")


def load_memory(proc, scope: str) -> dict[str, Any]:
    p = get_memory_path(proc, scope)
    try:
        if p.exists():
            import json
            data = json.loads(p.read_text() or "{}")
            return data if isinstance(data, dict) else {}
    except Exception:
        pass
    return {}


def save_memory(proc, scope: str, data: dict[str, Any]) -> None:
    p = get_memory_path(proc, scope)
    try:
        p.parent.mkdir(parents=True, exist_ok=True)
        import json
        p.write_text(json.dumps(data, indent=2))
    except Exception as e:
        raise ValueError(f"Failed to save {scope} memory: {e}") from e
