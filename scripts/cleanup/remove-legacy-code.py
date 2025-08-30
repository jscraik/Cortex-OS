#!/usr/bin/env python3

# Script to remove legacy format handling from mcp-config-storage.ts

import re


def remove_legacy_code():
    # Read the file
    with open("packages/mcp/src/mcp-config-storage.ts") as f:
        content = f.read()

    # Define the pattern to match the legacy code block
    # This matches from the legacy comment to the closing brace of the if block
    pattern = r"\s*// Handle legacy format where servers is an object with names as keys\s*if \(rawConfig\.servers && !Array\.isArray\(rawConfig\.servers\)\) \{[\s\S]*?for \(const \[name, serverData\] of Object\.entries\(serversObject\)\) \{[\s\S]*?type: transportType,[\s\S]*?transport: transportType,[\s\S]*?\}[\s\S]*?\}[\s\S]*?\}"

    # Replace the legacy code with just the assignment
    replacement = """
      const config = rawConfig as McpRuntimeConfig;

      // Ensure servers object exists
      if (!config.servers) {
        config.servers = {};
      }"""

    # Perform the replacement
    new_content = re.sub(pattern, replacement, content, flags=re.MULTILINE)

    # Write the file back
    with open("packages/mcp/src/mcp-config-storage.ts", "w") as f:
        f.write(new_content)


if __name__ == "__main__":
    remove_legacy_code()
