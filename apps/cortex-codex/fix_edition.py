#!/usr/bin/env python3
import os


def fix_edition(file_path):
    try:
        with open(file_path) as f:
            content = f.read()

        if 'edition = "2024"' in content:
            new_content = content.replace('edition = "2024"', 'edition = "2021"')
            with open(file_path, "w") as f:
                f.write(new_content)
            print(f"Fixed: {file_path}")
            return True
    except Exception as e:
        print(f"Error processing {file_path}: {e}")
    return False


# Find all Cargo.toml files
cargo_files = []
for root, dirs, files in os.walk("."):
    for file in files:
        if file == "Cargo.toml":
            cargo_files.append(os.path.join(root, file))

print(f"Found {len(cargo_files)} Cargo.toml files")

fixed_count = 0
for cargo_file in cargo_files:
    if fix_edition(cargo_file):
        fixed_count += 1

print(f"Fixed {fixed_count} files")
