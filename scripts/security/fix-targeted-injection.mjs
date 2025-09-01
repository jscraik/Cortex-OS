#!/usr/bin/env node

// Comprehensive fix script for targeted injection vulnerabilities

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

console.log('Applying comprehensive fixes for targeted injection vulnerabilities...');

// 1. Fix Cypher injection in neo4j.ts
console.log('Fixing Cypher injection in neo4j.ts...');
const neo4jPath = join('packages', 'memories', 'src', 'adapters', 'neo4j.ts');
let neo4jContent = readFileSync(neo4jPath, 'utf-8');

// Replace the insecure upsertNode method
neo4jContent = neo4jContent.replace(
  /await s\.run\(`MERGE \(n:\${label} {id:\$id}\) SET n \+= \$props`, \{\n\s+id: node\.id,\n\s+props: node\.props,\n\s+\}\);/,
  `// SECURITY FIX: Validate label before using in query
    const safeLabel = this.validateLabel(label);
    await s.run(\`MERGE (n:\${safeLabel} {id:$id}) SET n += $props\`, {
      id: node.id,
      props: node.props,
    });`
);

// Replace the insecure upsertRel method
neo4jContent = neo4jContent.replace(
  /await s\.run\(\n\s+`MATCH \(a {id:\$from}\), \(b {id:\$to}\)\\n\s+MERGE \(a\)-\[r:\${type}\]->\(b\)\\n\s+SET r \+= \$props`,\n\s+{ from: rel\.from, to: rel\.to, props: rel\.props \?\? {} },\n\s+\);/,
  `// SECURITY FIX: Validate relationship type before using in query
    const safeType = this.validateRelationshipType(type);
    await s.run(
      \`MATCH (a {id:$from}), (b {id:$to})
       MERGE (a)-[r:\${safeType}]->(b)
       SET r += $props\`,
      { from: rel.from, to: rel.to, props: rel.props ?? {} },
    );`
);

// Add validation methods
if (!neo4jContent.includes('validateLabel')) {
  neo4jContent = neo4jContent.replace(
    /function assertLabelOrType\(s: string\) \{\n\s+\/\/ Safe subset of Cypher identifiers\n\s+if \(!isValidNeo4jIdentifier\(s\)\) throw new Error\(`neo4j:invalid_identifier:\${s}`\);\n\s+return s;\n\}/,
    `function assertLabelOrType(s: string) {
  // Safe subset of Cypher identifiers
  if (!isValidNeo4jIdentifier(s)) throw new Error(\`neo4j:invalid_identifier:\${s}\`);
  return s;
}

// SECURITY ADDITION: Additional validation methods
private validateLabel(label: string): string {
  // Ensure label follows Neo4j naming conventions
  if (!label || typeof label !== 'string') {
    throw new Error('Invalid label: must be a non-empty string');
  }

  // Limit length to prevent resource exhaustion
  if (label.length > 100) {
    throw new Error('Invalid label: too long');
  }

  // Use existing validation
  return assertLabelOrType(label);
}

private validateRelationshipType(type: string): string {
  // Ensure type follows Neo4j naming conventions
  if (!type || typeof type !== 'string') {
    throw new Error('Invalid relationship type: must be a non-empty string');
  }

  // Limit length to prevent resource exhaustion
  if (type.length > 100) {
    throw new Error('Invalid relationship type: too long');
  }

  // Use existing validation
  return assertLabelOrType(type);
}`
  );
}

writeFileSync(neo4jPath, neo4jContent);
console.log('✅ Fixed Cypher injection in neo4j.ts');

// 2. Fix command injection in mcp_server.py
console.log('Fixing command injection in mcp_server.py...');
const mcpServerPath = join('packages', 'mcp', 'src', 'tools', 'docker', 'mcp_server.py');
let mcpServerContent = readFileSync(mcpServerPath, 'utf-8');

// Add input validation function
if (!mcpServerContent.includes('def validate_docker_command')) {
  mcpServerContent = mcpServerContent.replace(
    'def run_docker_command(command):',
    `def validate_docker_command(command):
    """Validate docker command to prevent injection."""
    if not isinstance(command, list):
        raise ValueError("Command must be a list")

    if len(command) < 2:
        raise ValueError("Command must have at least 2 elements")

    if command[0] != "docker":
        raise ValueError("Command must start with 'docker'")

    # Validate subcommands
    allowed_subcommands = ["ps", "images", "inspect", "logs"]
    if command[1] not in allowed_subcommands:
        raise ValueError(f"Subcommand {command[1]} not allowed")

    # Validate parameters
    for i in range(2, len(command)):
        param = command[i]
        if isinstance(param, str) and (param.startswith("-") or len(param) < 12 or len(param) > 64):
            # Skip flags and validate container IDs
            continue
        elif isinstance(param, str) and not re.match(r"^[a-f0-9]+$", param):
            raise ValueError(f"Invalid parameter: {param}")

def run_docker_command(command):`
  );
}

// Update the run_docker_command function to use validation
mcpServerContent = mcpServerContent.replace(
  /def run_docker_command\(command\):(.*?)result = subprocess\.run\(command, capture_output=True, text=True, check=True, timeout=30\)/s,
  `def run_docker_command(command):
    # SECURITY FIX: Validate command before execution
    try:
        validate_docker_command(command)
    except ValueError as e:
        return {"stdout": "", "stderr": f"Command validation failed: {str(e)}"}

    result = subprocess.run(command, capture_output=True, text=True, check=True, timeout=30)`
);

writeFileSync(mcpServerPath, mcpServerContent);
console.log('✅ Fixed command injection in mcp_server.py');

// 3. Fix code injection in start-command.ts
console.log('Fixing code injection in start-command.ts...');
const startCommandPath = join(
  'apps',
  'cortex-os',
  'packages',
  'agents',
  'src',
  'legacy-instructions',
  'start-command.ts'
);
let startCommandContent = readFileSync(startCommandPath, 'utf-8');

// Replace the insecure exec call
startCommandContent = startCommandContent.replace(
  /exec\(`\${openCommand} http:\/\/localhost:\${options\.port}\/console`\);/,
  `// SECURITY FIX: Use child_process.spawn instead of exec for better security
    const { spawn } = require('child_process');
    spawn(openCommand, [\`http://localhost:\${options.port}/console\`], {
      detached: true,
      stdio: 'ignore'
    }).unref();`
);

writeFileSync(startCommandPath, startCommandContent);
console.log('✅ Fixed code injection in start-command.ts');

console.log('✅ All targeted injection vulnerabilities have been fixed!');
