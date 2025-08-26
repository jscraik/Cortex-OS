import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

console.log('Validating documentation authority chain...');

const repoRoot = join(process.cwd(), '..', '..');
const requiredDocs = [
  join('.cortex', 'rules', 'AGENTS.md'),
  join('.cortex', 'rules', 'RULES_OF_AI.md')
];

let valid = true;

for (const doc of requiredDocs) {
  const fullPath = join(repoRoot, doc);
  if (!existsSync(fullPath)) {
    console.error(`❌ Required document missing: ${doc}`);
    valid = false;
  } else {
    console.log(`✅ Found: ${doc}`);
  }
}

// Check for authority declaration in AGENTS.md
const agentsPath = join(repoRoot, '.cortex', 'rules', 'AGENTS.md');
if (existsSync(agentsPath)) {
  const agentsContent = readFileSync(agentsPath, 'utf8');
  if (!agentsContent.includes('single source of truth for agent roles')) {
    console.error('❌ AGENTS.md missing authority declaration');
    valid = false;
  }
}

if (!valid) {
  process.exit(1);
}

console.log('✅ Documentation authority chain is valid');