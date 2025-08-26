import { readFileSync, existsSync } from 'fs';

console.log('Validating documentation authority chain...');

const requiredDocs = [
  '.cortex/rules/AGENTS.md',
  '.cortex/rules/RULES_OF_AI.md'
];

let valid = true;

for (const doc of requiredDocs) {
  if (!existsSync(doc)) {
    console.error(`❌ Required document missing: ${doc}`);
    valid = false;
  } else {
    console.log(`✅ Found: ${doc}`);
  }
}

// Check for "AGENTS.md is the boss" reference
if (existsSync('.cortex/rules/AGENTS.md')) {
  const agentsContent = readFileSync('.cortex/rules/AGENTS.md', 'utf8');
  if (!agentsContent.includes('AGENTS.md is the boss')) {
    console.error('❌ AGENTS.md missing authority declaration');
    valid = false;
  }
}

if (!valid) {
  process.exit(1);
}

console.log('✅ Documentation authority chain is valid');
