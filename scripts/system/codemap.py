#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import sys
from collections import Counter, defaultdict
from datetime import datetime, timedelta
from pathlib import Path
from typing import Iterable, Sequence

BRAND = "brAInwav"
IGNORE_DIRS_DEFAULT = {
    ".git",
    "node_modules",
    "dist",
    "build",
    "target",
    "out",
    "vendor",
    ".venv",
    "venv",
    "__pycache__",
    ".tox",
    ".next",
    ".nuxt",
    ".idea",
    ".vscode",
    "coverage",
    ".pytest_cache",
    ".nx",
}
TEST_FILE_PATTERNS = (
    re.compile(r".*/tests?/.*", re.IGNORECASE),
    re.compile(r".*test\\..*", re.IGNORECASE),
    re.compile(r".*\\.test\\..*", re.IGNORECASE),
    re.compile(r".*\\.spec\\..*", re.IGNORECASE),
    re.compile(r".*_test\\..*", re.IGNORECASE),
)
EXT_LANG = {
    ".py": "Python",
    ".go": "Go",
    ".js": "JavaScript",
    ".jsx": "JavaScript",
    ".ts": "TypeScript",
    ".tsx": "TypeScript",
    ".java": "Java",
    ".kt": "Kotlin",
    ".rb": "Ruby",
    ".rs": "Rust",
    ".c": "C",
    ".h": "C",
    ".cpp": "C++",
    ".hpp": "C++",
    ".cs": "C#",
    ".php": "PHP",
    ".scala": "Scala",
    ".sh": "Shell",
    ".bash": "Shell",
    ".zsh": "Shell",
    ".sql": "SQL",
    ".swift": "Swift",
    ".yaml": "YAML",
    ".yml": "YAML",
    ".json": "JSON",
    ".graphql": "GraphQL",
    ".proto": "Protobuf",
}
HTTP_PATTERNS = (
    (re.compile(r"@(?:app|bp|router)\.route\(\s*['\"]([^'\"]+)['\"]"), "py-route"),
    (re.compile(r"@(?:app|api|router)\.(get|post|put|delete|patch)\(\s*['\"]([^'\"]+)['\"]"), "py-method"),
    (re.compile(r"\b(?:app|router)\.(get|post|put|delete|patch)\(\s*['\"]([^'\"]+)['\"]"), "express"),
    (re.compile(r"@(?:Get|Post|Put|Delete|Patch)\(\s*['\"]([^'\"]+)['\"]"), "nest"),
    (re.compile(r"\b(?:r|router)\.(GET|POST|PUT|DELETE|PATCH)\(\s*['\"]([^'\"]+)['\"]"), "go-router"),
    (re.compile(r"http\.HandleFunc\(\s*['\"]([^'\"]+)['\"]"), "go-std"),
)
OPTIONAL_TOOLS = ("lizard", "madge", "depcheck")
SECTION_KEYS = ("languages", "size", "git", "complexity", "tests", "apis", "ops", "analysis")
SKIP_SUFFIXES = {".png", ".jpg", ".jpeg", ".gif", ".bmp", ".ico", ".pdf", ".zip", ".tar", ".gz", ".7z", ".min.js", ".min.css"}


def run_command(command: Sequence[str], cwd: Path | None = None) -> tuple[int, str, str]:
    try:
        completed = subprocess.run(
            command,
            cwd=cwd,
            capture_output=True,
            text=True,
            check=False,
        )
        return completed.returncode, completed.stdout, completed.stderr
    except FileNotFoundError as err:  # pragma: no cover - exercised via command stubs
        return 127, "", str(err)


def load_nx_projects(repo: Path) -> dict[str, dict[str, str]]:
    projects: dict[str, dict[str, str]] = {}
    for base in ("apps", "packages", "libs"):
        root = repo / base
        if not root.exists():
            continue
        for path in root.rglob("project.json"):
            try:
                data = json.loads(path.read_text(encoding="utf-8"))
            except json.JSONDecodeError:
                continue
            name = data.get("name")
            if not name:
                continue
            projects[name] = {
                "root": str(path.parent.resolve()),
                "type": data.get("projectType", ""),
            }
    return projects


def resolve_scope(repo: Path, scope_spec: str, projects: dict[str, dict[str, str]]) -> dict[str, str]:
    spec = scope_spec or "repo"
    if ":" in spec:
        kind, target = spec.split(":", 1)
    else:
        kind, target = spec, ""
    kind = kind.strip().lower()
    target = target.strip()
    if kind in {"repo", "repository"}:
        return {"scope": "repo", "target": ".", "root": str(repo)}
    if kind == "path":
        root = (repo / target).resolve()
        if not root.exists():
            raise ValueError(f"Scope path not found: {target}")
        return {"scope": "path", "target": target or ".", "root": str(root)}
    if kind in {"package", "app", "project"}:
        project = projects.get(target)
        if not project:
            raise ValueError(f"Unknown Nx project: {target}")
        expected_type = "library" if kind == "package" else "application"
        if kind != "project" and project.get("type") != expected_type:
            raise ValueError(f"Project '{target}' is not a {kind}")
        return {"scope": kind, "target": target, "root": project["root"]}
    raise ValueError(f"Unsupported scope: {scope_spec}")


def list_files(root: Path, ignore_dirs: set[str]) -> list[Path]:
    files: list[Path] = []
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if d not in ignore_dirs]
        for name in filenames:
            path = Path(dirpath) / name
            if path.suffix.lower() in SKIP_SUFFIXES:
                continue
            files.append(path)
    return files


def detect_language(path: Path) -> str:
    return EXT_LANG.get(path.suffix.lower(), "Other")


def summarize_languages(files: Sequence[Path]) -> list[dict[str, object]]:
    counts = Counter(detect_language(path) for path in files)
    return [
        {"language": language, "file_count": count}
        for language, count in counts.most_common()
    ]


def _git_capture(repo: Path, command: Sequence[str]) -> tuple[int, str]:
    code, out, _ = run_command(command, cwd=repo)
    return code, out


def _collect_hotspots(repo: Path, files_set: set[Path], since_days: int) -> list[dict[str, object]]:
    since_date = (datetime.utcnow() - timedelta(days=since_days)).date().isoformat()
    code, out, _ = run_command(
        ("git", "log", f"--since={since_date}", "--name-only", "--pretty=format:"),
        cwd=repo,
    )
    counts: Counter[str] = Counter()
    if code != 0:
        return []
    for line in out.splitlines():
        candidate = (repo / line.strip()).resolve()
        if line.strip() and candidate in files_set:
            counts[str(candidate.relative_to(repo))] += 1
    return [{"path": path, "changes": changes} for path, changes in counts.most_common()]


def gather_git_info(repo: Path, files_set: set[Path], since_days: int) -> dict[str, object]:
    info: dict[str, object] = {"is_git": False}
    code, out = _git_capture(repo, ("git", "rev-parse", "--is-inside-work-tree"))
    if code != 0 or "true" not in out:
        return info
    info["is_git"] = True
    code, out = _git_capture(repo, ("git", "symbolic-ref", "refs/remotes/origin/HEAD"))
    if code == 0 and out.strip():
        info["default_branch"] = out.strip().split("/")[-1]
    else:
        _, branch = _git_capture(repo, ("git", "rev-parse", "--abbrev-ref", "HEAD"))
        info["default_branch"] = branch.strip()
    code, out = _git_capture(repo, ("git", "log", "-1", "--pretty=format:%H|%aI|%an|%s"))
    if code == 0 and out.strip():
        parts = out.strip().split("|", 3)
        if len(parts) == 4:
            info["last_commit"] = {
                "hash": parts[0],
                "date": parts[1],
                "author": parts[2],
                "subject": parts[3],
            }
    code, out = _git_capture(repo, ("git", "shortlog", "-sn", "--all"))
    if code == 0:
        contributors: list[dict[str, object]] = []
        for row in out.strip().splitlines():
            row = row.strip()
            if not row:
                continue
            parts = row.split("\t", 1) if "\t" in row else row.split(maxsplit=1)
            if len(parts) == 2 and parts[0].isdigit():
                contributors.append({"name": parts[1].strip(), "commits": int(parts[0])})
        info["contributors"] = contributors
    info["hotspots"] = _collect_hotspots(repo, files_set, since_days)
    return info


def _rank_complexity(records: dict[str, dict[str, float]]) -> list[dict[str, object]]:
    sortable = [
        (
            details.get("avg_cyclomatic_complexity", 0),
            details.get("max_cyclomatic_complexity", 0),
            details.get("nloc", 0),
            path,
            details,
        )
        for path, details in records.items()
    ]
    sortable.sort(reverse=True)
    ranked: list[dict[str, object]] = []
    for _, __, ___, path, details in sortable[:500]:
        ranked.append({
            "path": path,
            "avg_cc": details.get("avg_cyclomatic_complexity", 0),
            "max_cc": details.get("max_cyclomatic_complexity", 0),
            "functions": details.get("function_count", 0),
            "nloc": details.get("nloc", 0),
        })
    return ranked


def _create_lizard_excludes(ignore_dirs: set[str]) -> tuple[str, ...]:
    excludes: list[str] = []
    for directory in ignore_dirs:
        excludes.extend(["-x", f"**/{directory}/*"])
    return tuple(excludes)


def _safe_load_json(payload: str) -> dict[str, object] | list[object] | None:
    try:
        return json.loads(payload)
    except json.JSONDecodeError:
        return None


def _parse_lizard_records(
    repo: Path,
    payload: dict[str, object] | list[object] | None,
) -> tuple[dict[str, dict[str, float]], dict[str, int]]:
    records: dict[str, dict[str, float]] = {}
    nloc_map: dict[str, int] = {}
    if not isinstance(payload, dict):
        return records, nloc_map
    for file_obj in payload.get("files", []):
        filename = file_obj.get("filename")
        if not filename:
            continue
        rel = _normalize_relative_path(repo, Path(filename))
        records[rel] = {
            "avg_cyclomatic_complexity": file_obj.get("average_cyclomatic_complexity", 0),
            "max_cyclomatic_complexity": max(
                (fn.get("cyclomatic_complexity", 0) for fn in file_obj.get("functions", [])),
                default=0,
            ),
            "function_count": len(file_obj.get("functions", [])),
            "nloc": file_obj.get("nloc", 0),
        }
        nloc_map[rel] = file_obj.get("nloc", 0)
    return records, nloc_map


def compute_complexity(
    repo: Path,
    scan_root: Path,
    ignore_dirs: set[str],
    requested_tools: set[str],
) -> tuple[dict[str, object], dict[str, int]]:
    info: dict[str, object] = {"tool": "lizard", "available": False}
    if "lizard" not in requested_tools:
        info["reason"] = "not requested"
        return info, {}
    command = ("lizard", "-j", *_create_lizard_excludes(ignore_dirs), str(scan_root))
    code, out, err = run_command(command, cwd=repo)
    if code != 0:
        info["error"] = err or out
        return info, {}
    payload = _safe_load_json(out)
    if payload is None:
        info["error"] = "failed to parse lizard JSON output"
        return info, {}
    info["available"] = True
    records, nloc_map = _parse_lizard_records(repo, payload)
    info["worst_files"] = _rank_complexity(records)
    return info, nloc_map


def _normalize_relative_path(repo: Path, path: Path) -> str:
    try:
        return str(path.resolve().relative_to(repo))
    except ValueError:
        return str(path)


def _count_lines(path: Path, limit_bytes: int = 2_000_000) -> int:
    try:
        if path.stat().st_size > limit_bytes:
            return 0
        with path.open(encoding="utf-8", errors="ignore") as handle:
            return sum(1 for _ in handle)
    except OSError:
        return 0


def scan_http_endpoints(files: Sequence[Path], repo: Path, max_bytes: int = 200000) -> list[dict[str, object]]:
    endpoints: list[dict[str, object]] = []
    for path in files:
        try:
            if path.stat().st_size > max_bytes:
                continue
            text = path.read_text(encoding="utf-8", errors="ignore")
        except OSError:
            continue
        rel = _normalize_relative_path(repo, path)
        for pattern, kind in HTTP_PATTERNS:
            for match in pattern.finditer(text):
                endpoints.extend(_describe_endpoint(rel, kind, match))
    return endpoints


def _describe_endpoint(rel: str, kind: str, match: re.Match[str]) -> list[dict[str, object]]:
    method = match.group(1) if match.groups() else "get"
    path_value = match.group(2) if match.lastindex and match.lastindex >= 2 else match.group(1)
    if kind == "py-route":
        return [{"file": rel, "method": "GET", "path": match.group(1), "via": "decorator"}]
    via = {
        "py-method": "decorator",
        "express": "express",
        "nest": "nest",
        "go-router": "router",
        "go-std": "http",
    }.get(kind, kind)
    methods = [method.upper()] if method else ["GET"]
    return [{"file": rel, "method": entry, "path": path_value, "via": via} for entry in methods]


def detect_ops(files: Sequence[Path], repo: Path) -> dict[str, list[str]]:
    ops: defaultdict[str, list[str]] = defaultdict(list)
    for path in files:
        rel = _normalize_relative_path(repo, path)
        lower = path.name.lower()
        if lower.startswith("dockerfile"):
            ops["dockerfiles"].append(rel)
        if lower in {"docker-compose.yml", "docker-compose.yaml", "compose.yml", "compose.yaml"}:
            ops["compose"].append(rel)
        if path.suffix.lower() in {".yml", ".yaml"}:
            try:
                text = path.read_text(encoding="utf-8", errors="ignore")
            except OSError:
                text = ""
            if "apiVersion:" in text and "kind:" in text:
                ops["k8s"].append(rel)
        if lower.startswith(".env") or ".env" in lower:
            ops["env_files"].append(rel)
        if lower == "procfile":
            ops["procfile"].append(rel)
        if path.suffix.lower() == ".tf":
            ops["terraform"].append(rel)
        if path.suffix.lower() == ".sh" and "deploy" in lower:
            ops["deploy_scripts"].append(rel)
        if ".github" in path.parts and path.suffix.lower() in {".yml", ".yaml"}:
            ops["ci"].append(rel)
    return dict(ops)


def detect_tests(files: Sequence[Path], repo: Path) -> dict[str, object]:
    detected: list[str] = []
    for path in files:
        rel = _normalize_relative_path(repo, path)
        if any(pattern.match(rel) for pattern in TEST_FILE_PATTERNS):
            detected.append(rel)
    return {"count": len(detected), "files": sorted(detected)}


def parse_coverage(root: Path) -> dict[str, object]:
    data_path = root / "coverage" / "coverage-summary.json"
    if data_path.exists():
        try:
            payload = json.loads(data_path.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            payload = {}
        total = payload.get("total", {})
        if total:
            return {
                "line": total.get("lines", {}).get("pct"),
                "branch": total.get("branches", {}).get("pct"),
                "functions": total.get("functions", {}).get("pct"),
                "statements": total.get("statements", {}).get("pct"),
                "source": _normalize_relative_path(root, data_path),
            }
    cov_xml = root / "coverage.xml"
    if cov_xml.exists():
        text = cov_xml.read_text(encoding="utf-8", errors="ignore")
        line_rate = re.search(r"line-rate=\"([0-9.]+)\"", text)
        if line_rate:
            return {"line": round(float(line_rate.group(1)) * 100, 2), "source": _normalize_relative_path(root, cov_xml)}
    return {}


def build_analysis(repo: Path, scan_root: Path, requested_tools: set[str]) -> dict[str, dict[str, object]]:
    analysis: dict[str, dict[str, object]] = {}
    if "madge" in requested_tools:
        command = ("madge", "--extensions", "ts,tsx,js,jsx", "--json", str(scan_root))
        code, out, err = run_command(command, cwd=repo)
        entry: dict[str, object] = {"available": False}
        if code == 0:
            try:
                entry["data"] = json.loads(out)
                entry["available"] = True
            except json.JSONDecodeError:
                entry["error"] = "failed to parse madge output"
        else:
            entry["error"] = err or out
        analysis["js_dependency_graph"] = entry
    if "depcheck" in requested_tools:
        code, out, err = run_command(("depcheck", "--json"), cwd=scan_root)
        entry = {"available": False}
        if code == 0:
            try:
                entry["data"] = json.loads(out)
                entry["available"] = True
            except json.JSONDecodeError:
                entry["error"] = "failed to parse depcheck output"
        else:
            entry["error"] = err or out
        analysis["depcheck"] = entry
    return analysis


def filter_codemap(codemap: dict[str, object], sections: set[str]) -> dict[str, object]:
    if not sections:
        return codemap
    kept: dict[str, object] = {}
    for key, value in codemap.items():
        if key in SECTION_KEYS and key not in sections:
            continue
        kept[key] = value
    return kept


def make_markdown_summary(codemap: dict[str, object], sections: set[str]) -> str:
    lines = [f"# {BRAND} codemap — {codemap.get('repo_name', '')}"]
    scan = codemap.get("scan", {})
    lines.append(
        f"Scope: {scan.get('scope', 'repo')} ({scan.get('target', '.')}) — Root: `{scan.get('root', '')}`"
    )
    lines.append(f"Generated: `{codemap.get('generated_at', '')}`")
    include = lambda key: key in codemap and (not sections or key in sections)
    if include("languages"):
        lines.append("## Languages (top)")
        lines.extend(
            f"- {item['language']}: {item['file_count']} files"
            for item in codemap["languages"][:10]
        )
    if include("size"):
        lines.append("## Largest Files")
        lines.extend(
            f"- {item['path']} — {item['loc']} LOC"
            for item in codemap["size"]["largest_files"][:20]
        )
    if include("git"):
        lines.append("## Hotspots")
        lines.extend(
            f"- {item['path']} — {item['changes']} changes"
            for item in codemap["git"].get("hotspots", [])[:20]
        )
    if include("complexity"):
        lines.append("## Complexity")
        lines.extend(
            f"- {item['path']} — avg CC {item['avg_cc']} max {item['max_cc']} funcs {item['functions']}"
            for item in codemap["complexity"].get("worst_files", [])[:20]
        )
    if include("tests"):
        tests = codemap["tests"]
        lines.append("## Tests")
        lines.append(f"- Files: {tests.get('count', 0)}")
        coverage = tests.get("coverage", {})
        if coverage.get("line") is not None:
            lines.append(f"- Coverage (line): {coverage['line']}%")
    if include("apis"):
        lines.append("## HTTP Endpoints")
        lines.extend(
            f"- {item['method']} {item['path']} ({item['file']})"
            for item in codemap["apis"].get("http", [])[:50]
        )
    if include("ops"):
        lines.append("## Ops Artifacts")
        lines.extend(f"- {key}: {len(value)}" for key, value in codemap["ops"].items() if value)
    return "\n".join(lines) + "\n"


def parse_list_argument(value: str | None) -> tuple[str, ...]:
    if not value:
        return ()
    parts = [part.strip() for part in value.split(",")]
    return tuple(part for part in parts if part)


def _compose_ignore_dirs(extra_ignores: Iterable[str] | None) -> set[str]:
    ignore_dirs = set(IGNORE_DIRS_DEFAULT)
    if extra_ignores:
        ignore_dirs.update(extra_ignores)
    return ignore_dirs


def _build_size_summary(
    files: Sequence[Path],
    repo: Path,
    nloc_map: dict[str, int],
) -> dict[str, object]:
    ordered: list[tuple[str, int]] = []
    for path in files:
        rel = _normalize_relative_path(repo, path)
        loc = nloc_map.get(rel) or _count_lines(path)
        ordered.append((rel, loc))
    ordered.sort(key=lambda item: item[1], reverse=True)
    return {
        "file_count": len(files),
        "largest_files": [
            {"path": rel, "loc": loc}
            for rel, loc in ordered[:200]
        ],
    }


def _merge_tests_with_coverage(
    files: Sequence[Path],
    repo: Path,
    scan_root: Path,
) -> dict[str, object]:
    tests = detect_tests(files, repo)
    coverage = parse_coverage(scan_root) or parse_coverage(repo)
    if coverage:
        enriched = dict(tests)
        enriched["coverage"] = coverage
        return enriched
    return tests


def _build_notes(
    ignore_dirs: set[str],
    since_days: int,
    sections: Sequence[str] | None,
    requested_tools: set[str],
) -> dict[str, object]:
    return {
        "ignore_dirs": sorted(ignore_dirs),
        "hotspot_window_days": since_days,
        "sections_requested": list(sections or []),
        "tools_requested": sorted(requested_tools),
    }


def _compute_codemap_payload(
    repo: Path,
    scope_info: dict[str, str],
    scan_root: Path,
    ignore_dirs: set[str],
    since_days: int,
    requested_tools: set[str],
    sections: Sequence[str] | None,
) -> tuple[dict[str, object], set[str]]:
    files = list_files(scan_root, ignore_dirs)
    files_set = {path.resolve() for path in files}
    languages = summarize_languages(files)
    git_info = gather_git_info(repo, files_set, since_days)
    complexity, nloc_map = compute_complexity(repo, scan_root, ignore_dirs, requested_tools)
    size = _build_size_summary(files, repo, nloc_map)
    tests = _merge_tests_with_coverage(files, repo, scan_root)
    endpoints = scan_http_endpoints(files, repo)
    ops = detect_ops(files, repo)
    analysis = build_analysis(repo, scan_root, requested_tools)
    notes = _build_notes(ignore_dirs, since_days, sections, requested_tools)
    codemap = _assemble_codemap(
        repo,
        scope_info,
        notes,
        requested_tools,
        languages,
        size,
        git_info,
        complexity,
        tests,
        endpoints,
        ops,
        analysis,
    )
    return codemap, set(sections or [])


def _assemble_codemap(
    repo: Path,
    scope_info: dict[str, str],
    notes: dict[str, object],
    requested_tools: set[str],
    languages: list[dict[str, object]],
    size: dict[str, object],
    git_info: dict[str, object],
    complexity: dict[str, object],
    tests: dict[str, object],
    endpoints: list[dict[str, object]],
    ops: dict[str, list[str]],
    analysis: dict[str, dict[str, object]],
) -> dict[str, object]:
    return {
        "repo_path": str(repo),
        "repo_name": repo.name,
        "generated_at": datetime.utcnow().isoformat() + "Z",
        "scan": scope_info,
        "notes": notes,
        "tools": {"requested": sorted(requested_tools)},
        "languages": languages,
        "size": size,
        "git": git_info,
        "complexity": complexity,
        "tests": tests,
        "apis": {"http": endpoints},
        "ops": ops,
        "analysis": analysis,
    }


def _write_outputs(
    codemap: dict[str, object],
    json_path: Path,
    markdown_path: Path,
    sections: set[str],
) -> None:
    json_path.parent.mkdir(parents=True, exist_ok=True)
    json_path.write_text(json.dumps(codemap, indent=2), encoding="utf-8")
    markdown_path.parent.mkdir(parents=True, exist_ok=True)
    summary = make_markdown_summary(codemap, sections)
    markdown_path.write_text(summary, encoding="utf-8")


def _announce_success(
    scope_info: dict[str, str],
    json_path: Path,
    markdown_path: Path,
) -> None:
    scope = scope_info["scope"]
    target = scope_info.get("target", ".") if scope != "repo" else "."
    print(f"{BRAND} codemap :: wrote {json_path} and {markdown_path} for {scope}:{target}")


def generate_codemap(
    *,
    repo_path: Path,
    json_path: Path,
    markdown_path: Path,
    since_days: int,
    extra_ignores: Iterable[str] | None,
    scope: str,
    sections: Sequence[str] | None,
    tools: Sequence[str] | None,
) -> dict[str, object]:
    repo = repo_path.resolve()
    projects = load_nx_projects(repo)
    scope_info = resolve_scope(repo, scope, projects)
    scan_root = Path(scope_info["root"]).resolve()
    ignore_dirs = _compose_ignore_dirs(extra_ignores)
    requested_tools = set(tools or OPTIONAL_TOOLS)
    codemap, requested_sections = _compute_codemap_payload(
        repo=repo,
        scope_info=scope_info,
        scan_root=scan_root,
        ignore_dirs=ignore_dirs,
        since_days=since_days,
        requested_tools=requested_tools,
        sections=sections,
    )
    filtered = filter_codemap(codemap, requested_sections)
    _write_outputs(filtered, json_path, markdown_path, requested_sections)
    _announce_success(scope_info, json_path, markdown_path)
    return filtered


def build_argument_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Generate brAInwav codemap snapshots")
    parser.add_argument("--repo", default=".", help="Path to the repository root")
    parser.add_argument("--out", default="out/codemap.json", help="Path for codemap JSON output")
    parser.add_argument("--md", default="out/codemap.md", help="Path for codemap Markdown output")
    parser.add_argument("--since-days", type=int, default=180, help="Git hotspot window in days")
    parser.add_argument("--scope", default="repo", help="Scope specifier (repo|package:<name>|app:<name>|path:<rel>)")
    parser.add_argument("--sections", help="Comma-separated sections to include (languages,size,git,complexity,tests,apis,ops,analysis)")
    parser.add_argument("--tools", help="Comma-separated optional tools to run (lizard,madge,depcheck,pydeps,go,jdeps)")
    parser.add_argument("--ignore", action="append", help="Additional directories to ignore", default=None)
    return parser


def main(argv: Sequence[str] | None = None) -> int:
    parser = build_argument_parser()
    args = parser.parse_args(argv)
    try:
        sections = parse_list_argument(args.sections)
        tools = parse_list_argument(args.tools)
        generate_codemap(
            repo_path=Path(args.repo),
            json_path=Path(args.out),
            markdown_path=Path(args.md),
            since_days=args.since_days,
            extra_ignores=args.ignore,
            scope=args.scope,
            sections=sections,
            tools=tools,
        )
    except ValueError as exc:
        print(f"{BRAND} codemap error: {exc}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":  # pragma: no cover
    sys.exit(main())
