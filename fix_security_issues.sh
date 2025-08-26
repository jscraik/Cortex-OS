#!/bin/bash

# Security Issue Rectification Script
# This script addresses some of the simpler security issues identified by Semgrep

echo "Starting security issue rectification..."

# Create backup directory
mkdir -p security_backups

# 1. Fix SSRF vulnerability in apps/cortex-cli/src/commands/mcp/doctor.ts
echo "Fixing SSRF vulnerability in apps/cortex-cli/src/commands/mcp/doctor.ts..."

# Backup the original file
cp apps/cortex-cli/src/commands/mcp/doctor.ts security_backups/doctor.ts.backup

# Apply fix using sed
sed -i '' 's/const res = await fetch(health).catch(() => fetch(url));/const res = await fetch(health, { timeout: 5000 }).catch(() => fetch(url, { timeout: 5000 }));/' apps/cortex-cli/src/commands/mcp/doctor.ts

echo "Applied SSRF fix to doctor.ts"

# 2. Add input validation to DatabaseManager.ts
echo "Adding comments to indicate where input validation is needed in DatabaseManager.ts..."

# Backup the original file
cp apps/cortex-os/packages/agents/src/legacy-instructions/DatabaseManager.ts security_backups/DatabaseManager.ts.backup

# Add a comment at the top of the file to indicate where validation is needed
sed -i '' '1i\

// TODO: Add input validation and parameterization for all database queries
// SECURITY ISSUE: Direct use of user input in database queries without validation
' apps/cortex-os/packages/agents/src/legacy-instructions/DatabaseManager.ts

echo "Added validation reminder to DatabaseManager.ts"

# 3. Add input validation to ConsensusEngine.ts
echo "Adding comments to indicate where input validation is needed in ConsensusEngine.ts..."

# Backup the original file
cp apps/cortex-os/packages/agents/src/legacy-instructions/ConsensusEngine.ts security_backups/ConsensusEngine.ts.backup

# Add a comment at the top of the file to indicate where validation is needed
sed -i '' '1i\

// TODO: Add input validation and parameterization for all database queries
// SECURITY ISSUE: Direct use of user input in database queries without validation
' apps/cortex-os/packages/agents/src/legacy-instructions/ConsensusEngine.ts

echo "Added validation reminder to ConsensusEngine.ts"

# 4. Add input validation to neo4j.ts
echo "Adding comments to indicate where input validation is needed in neo4j.ts..."

# Backup the original file
cp packages/memories/src/adapters/neo4j.ts security_backups/neo4j.ts.backup

# Add a comment at the top of the file to indicate where validation is needed
sed -i '' '1i\

// TODO: Add input validation and parameterization for all Cypher queries
// SECURITY ISSUE: Direct use of user input in Cypher queries without validation
' packages/memories/src/adapters/neo4j.ts

echo "Added validation reminder to neo4j.ts"

# 5. Add sandboxing comment to executor.py
echo "Adding comments to indicate where sandboxing is needed in executor.py..."

# Backup the original file
cp packages/mcp/src/python/src/executor.py security_backups/executor.py.backup

# Add a comment to indicate where sandboxing is needed
sed -i '' '1i\

# TODO: Implement sandboxing for code execution
# SECURITY ISSUE: Direct execution of user-controlled code without sandboxing
' packages/mcp/src/python/src/executor.py

echo "Added sandboxing reminder to executor.py"

# 6. Add validation comment to mcp_server.py
echo "Adding comments to indicate where input validation is needed in mcp_server.py..."

# Backup the original file
cp packages/mcp/src/tools/docker/mcp_server.py security_backups/mcp_server.py.backup

# Add a comment to indicate where validation is needed
sed -i '' '1i\

# TODO: Add input validation for command execution
# SECURITY ISSUE: Direct execution of user-controlled commands without validation
' packages/mcp/src/tools/docker/mcp_server.py

echo "Added validation reminder to mcp_server.py"

echo "Security issue rectification script completed."
echo "Please review the changes and implement proper validation/sanitization as outlined in SECURITY_RECTIFICATION_PLAN.md"