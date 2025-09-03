#!/bin/bash

# Backup the current global settings
cp ~/Library/Application\ Support/Code/User/settings.json ~/Library/Application\ Support/Code/User/settings.json.backup

# Create a temporary Python script to fix the JSON
cat > /tmp/fix_settings.py << 'EOF'
import json
import re

# Read the file
with open('/Users/jamiecraik/Library/Application Support/Code/User/settings.json', 'r') as f:
    content = f.read()

# Remove any existing rust-analyzer.checkOnSave.command entries
content = re.sub(r'"rust-analyzer\.checkOnSave\.command":\s*"[^"]*",?\s*\n?', '', content)
content = re.sub(r'"rust-analyzer\.checkOnSave":\s*{[^}]*},?\s*\n?', '', content)

# Parse as JSON to add the correct configuration
try:
    settings = json.loads(content)
except json.JSONDecodeError:
    print("Error: Invalid JSON in settings file")
    exit(1)

# Add correct rust-analyzer configuration
settings["rust-analyzer.check.command"] = "clippy"

# Ensure proper YAML/TOML formatters are configured
if "[yaml]" not in settings:
    settings["[yaml]"] = {"editor.defaultFormatter": "redhat.vscode-yaml"}
if "[yml]" not in settings:
    settings["[yml]"] = {"editor.defaultFormatter": "redhat.vscode-yaml"}
if "[toml]" not in settings:
    settings["[toml]"] = {"editor.defaultFormatter": "tamasfe.even-better-toml"}

# Write back to file
with open('/Users/jamiecraik/Library/Application Support/Code/User/settings.json', 'w') as f:
    json.dump(settings, f, indent=8)

print("Global settings updated successfully!")
EOF

# Run the Python script
python3 /tmp/fix_settings.py

# Clean up
rm /tmp/fix_settings.py

echo "Global VS Code settings have been updated!"
echo "Backup saved as: ~/Library/Application Support/Code/User/settings.json.backup"
