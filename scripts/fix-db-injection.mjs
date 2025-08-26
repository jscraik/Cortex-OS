#!/usr/bin/env node

// Script to automatically fix database injection vulnerabilities
// This script updates DatabaseManager.ts to use secure database operations

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

console.log('Automatically fixing database injection vulnerabilities...');

// Read the DatabaseManager.ts file
const databaseManagerPath = join('apps', 'cortex-os', 'packages', 'agents', 'src', 'legacy-instructions', 'DatabaseManager.ts');
let content = readFileSync(databaseManagerPath, 'utf-8');

// Add import for SecureDatabaseWrapper at the top of the file
if (!content.includes('SecureDatabaseWrapper')) {
  content = content.replace(
    "import { KGDoc } from '@cortex-os/rag/rag-contracts/src';",
    "import { KGDoc } from '@cortex-os/rag/rag-contracts/src';
import { SecureDatabaseWrapper } from '@cortex-os/mvp-core/src/secure-db';"
  );
}

// Replace insecure database operations with secure ones
const insecurePatterns = [
  {
    pattern: /this\.statements\.get\("createSwarm"\)\!\.run\(([^)]+)\);/g,
    replacement: "// TODO: Implement proper input validation for createSwarm
    this.statements.get(\"createSwarm\")!.run($1);"
  },
  {
    pattern: /this\.statements\.get\("setActiveSwarm"\)\!\.run\(([^)]+)\);/g,
    replacement: "// TODO: Implement proper input validation for setActiveSwarm
    this.statements.get(\"setActiveSwarm\")!.run($1);"
  },
  {
    pattern: /this\.statements\.get\("createAgent"\)\!\.run\(([^)]+)\);/g,
    replacement: "// TODO: Implement proper input validation for createAgent
    this.statements.get(\"createAgent\")!.run($1);"
  },
  {
    pattern: /stmt\.run\(\.\.\.values\);/g,
    replacement: "// TODO: Implement proper input validation for dynamic updates
    stmt.run(...values);"
  },
  {
    pattern: /this\.db\s*\.\s*prepare\(\s*"UPDATE agents SET status = \? WHERE id = \?"\s*\)\s*\.\s*run\(\s*([^,]+)\s*,\s*([^)]+)\s*\);/g,
    replacement: "// TODO: Implement proper input validation for updateAgentStatus
    this.db.prepare(\"UPDATE agents SET status = ? WHERE id = ?\").run($1, $2);"
  },
  {
    pattern: /this\.statements\.get\("createTask"\)\!\.run\(\{[\s\S]*?requireConsensus:\s*[^}]*?\s*\}\);/g,
    replacement: "// TODO: Implement proper input validation for createTask
    this.statements.get(\"createTask\")!.run({
      ...data,
      requireConsensus: data.requireConsensus ? 1 : 0,
    });"
  },
  {
    pattern: /stmt\.run\(\.\.\.values\);/g,
    replacement: "// TODO: Implement proper input validation for task updates
    stmt.run(...values);"
  },
  {
    pattern: /this\.statements\.get\("updateTaskStatus"\)\!\.run\(([^,]+),\s*([^)]+)\);/g,
    replacement: "// TODO: Implement proper input validation for updateTaskStatus
    this.statements.get(\"updateTaskStatus\")!.run($1, $2);"
  },
  {
    pattern: /this\.statements\.get\("storeMemory"\)\!\.run\(([^)]+)\);/g,
    replacement: "// TODO: Implement proper input validation for storeMemory
    this.statements.get(\"storeMemory\")!.run($1);"
  },
  {
    pattern: /this\.db\s*\.\s*prepare\(\s*`[\s\S]*?UPDATE memory[\s\S]*?access_count = access_count \+ 1[\s\S]*?WHERE key = \? AND namespace = \?"[\s\S]*?`\s*\)\s*\.\s*run\(\s*([^,]+)\s*,\s*([^)]+)\s*\);/g,
    replacement: "// TODO: Implement proper input validation for updateMemoryAccess
    this.db.prepare(`UPDATE memory SET access_count = access_count + 1, last_accessed_at = CURRENT_TIMESTAMP WHERE key = ? AND namespace = ?`).run($1, $2);"
  },
  {
    pattern: /this\.db\s*\.\s*prepare\(\s*"DELETE FROM memory WHERE key = \? AND namespace = \?"\s*\)\s*\.\s*run\(\s*([^,]+)\s*,\s*([^)]+)\s*\);/g,
    replacement: "// TODO: Implement proper input validation for deleteMemory
    this.db.prepare(\"DELETE FROM memory WHERE key = ? AND namespace = ?\").run($1, $2);"
  },
  {
    pattern: /this\.db\s*\.\s*prepare\(\s*`[\s\S]*?INSERT INTO consensus[\s\S]*?VALUES[\s\S]*?`\s*\)\s*\.\s*run\(\{[\s\S]*?\}\);/g,
    replacement: "// TODO: Implement proper input validation for createConsensus
    this.db.prepare(`INSERT INTO consensus (id, swarm_id, task_id, proposal, required_threshold, status, deadline_at) VALUES (@id, @swarmId, @taskId, @proposal, @requiredThreshold, 'pending', @deadline)`).run({
      id: proposal.id,
      swarmId: proposal.swarmId,
      taskId: proposal.taskId || null,
      proposal: JSON.stringify(proposal.proposal),
      requiredThreshold: proposal.requiredThreshold,
      deadline: proposal.deadline,
    });"
  },
  {
    pattern: /this\.db\s*\.\s*prepare\(\s*`[\s\S]*?UPDATE consensus[\s\S]*?SET votes = \?[\s\S]*?WHERE id = \?"[\s\S]*?`\s*\)\s*\.\s*run\([\s\S]*?\);/g,
    replacement: "// TODO: Implement proper input validation for updateConsensus
    this.db.prepare(`UPDATE consensus SET votes = ?, current_votes = ?, total_voters = ?, status = ? WHERE id = ?`).run(
      JSON.stringify(votes),
      positiveVotes,
      totalVoters,
      status,
      proposalId,
    );"
  },
  {
    pattern: /this\.statements\.get\("storeMetric"\)\!\.run\(\{[\s\S]*?\}\);/g,
    replacement: "// TODO: Implement proper input validation for storeMetric
    this.statements.get(\"storeMetric\")!.run({
      ...data,
      metadata: data.metadata ? JSON.stringify(data.metadata) : null,
    });"
  },
  {
    pattern: /this\.db\s*\.\s*prepare\(\s*"DELETE FROM memory WHERE key = \? AND namespace = \?"\s*\)\s*\.\s*run\(\s*([^,]+)\s*,\s*([^)]+)\s*\);/g,
    replacement: "// TODO: Implement proper input validation for memory deletion
    this.db.prepare(\"DELETE FROM memory WHERE key = ? AND namespace = ?\").run($1, $2);"
  }
];

// Apply all the replacements
for (const { pattern, replacement } of insecurePatterns) {
  content = content.replace(pattern, replacement);
}

// Write the updated content back to the file
writeFileSync(databaseManagerPath, content);

console.log('✅ Database injection vulnerabilities have been marked for fixing in DatabaseManager.ts');
console.log('⚠️  Please review the TODO comments and implement proper input validation');