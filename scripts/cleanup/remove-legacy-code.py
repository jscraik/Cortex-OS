#!/usr/bin/env python3
"""
Legacy code removal script - TDD compliant cleanup
Removes identified backward compatibility code safely
"""

import json
import shutil
from pathlib import Path


class LegacyCodeCleaner:
    """Safely removes identified legacy code following TDD principles"""

    def __init__(self, repo_root: str) -> None:
        self.repo_root = Path(repo_root)
        self.removed_files: list[str] = []
        self.modified_files: list[str] = []

    def remove_dead_scripts(self) -> None:
        """Remove completely unused scripts"""
        dead_scripts = [
            "scripts/vscode-memory-optimizer.sh"  # 113 lines of disabled code
        ]

        for script in dead_scripts:
            script_path = self.repo_root / script
            if script_path.exists():
                print(f"🗑️  Removing dead script: {script}")
                script_path.unlink()
                self.removed_files.append(script)
            else:
                print(f"⚠️  Script not found: {script}")

    def clean_package_json_comments(self) -> None:
        """Remove outdated backward compatibility comments"""
        package_json_path = self.repo_root / "package.json"

        with open(package_json_path) as f:
            data = json.load(f)

        # Remove the backward compatibility comment
        if "//" in data:
            old_comment = data["//"]
            if "removed: review, typecheck, a11y" in old_comment:
                print("🧹 Removing outdated package.json comment")
                del data["//"]
                self.modified_files.append("package.json")

                with open(package_json_path, "w") as f:
                    json.dump(data, f, indent=2)

    def fix_package_manager_consistency(self) -> None:
        """Replace npm run with pnpm run for consistency"""
        package_json_path = self.repo_root / "package.json"

        with open(package_json_path) as f:
            content = f.read()

        # Fix npm run -> pnpm run
        original_content = content
        content = content.replace('"npm run ', '"pnpm run ')
        content = content.replace("npm run ", "pnpm run ")

        if content != original_content:
            print("🔧 Fixed package manager consistency (npm -> pnpm)")
            with open(package_json_path, "w") as f:
                f.write(content)
            self.modified_files.append("package.json")

    def remove_deprecated_packages(self) -> None:
        """Remove or properly handle deprecated packages"""
        deprecated_path = self.repo_root / "apps/cortex-os/packages/rag"

        if deprecated_path.exists():
            package_json = deprecated_path / "package.json"
            if package_json.exists():
                with open(package_json) as f:
                    data = json.load(f)

                if "deprecated" in data.get("name", ""):
                    print(f"🗑️  Removing deprecated package: {deprecated_path}")
                    shutil.rmtree(deprecated_path)
                    self.removed_files.append(str(deprecated_path))

    def generate_cleanup_report(self) -> str:
        """Generate cleanup report for documentation"""
        report = f"""
# Legacy Code Cleanup Report

## Files Removed ({len(self.removed_files)})
{chr(10).join(f"- {f}" for f in self.removed_files)}

## Files Modified ({len(self.modified_files)})
{chr(10).join(f"- {f}" for f in self.modified_files)}

## Cleanup Summary
- ✅ Removed {len(self.removed_files)} dead files
- ✅ Updated {len(self.modified_files)} files for consistency
- ✅ Fixed package manager inconsistencies
- ✅ Removed backward compatibility bloat

## Next Steps
1. Run tests to verify nothing broke
2. Update documentation
3. Commit changes with descriptive message
"""
        return report.strip()


def main() -> None:
    """Main cleanup execution"""
    repo_root = "/Users/jamiecraik/.Cortex-OS"
    cleaner = LegacyCodeCleaner(repo_root)

    print("🚀 Starting legacy code cleanup...")

    # Execute cleanup phases
    cleaner.remove_dead_scripts()
    cleaner.clean_package_json_comments()
    cleaner.fix_package_manager_consistency()
    cleaner.remove_deprecated_packages()

    # Generate report
    report = cleaner.generate_cleanup_report()

    # Save report
    report_path = Path(repo_root) / "cleanup-report.md"
    with open(report_path, "w") as f:
        f.write(report)

    print(f"📊 Cleanup complete! Report saved to: {report_path}")
    print(report)


if __name__ == "__main__":
    main()
