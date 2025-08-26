import { readFileSync } from 'fs';
import { glob } from 'glob';

console.log('Validating repository structure...');

// Load repository policy
const repoPolicy = JSON.parse(readFileSync('../policy/policy.repo.json', 'utf8'));

// Check allowed paths
const allowedDirs = [
  ...repoPolicy.allowedPaths.apps.map(p => `apps/${p}`),
  ...repoPolicy.allowedPaths.packages.map(p => `packages/${p}`),
  ...repoPolicy.allowedPaths.services.map(p => `services/${p}`),
  ...repoPolicy.allowedPaths.libs.map(p => `libs/${p}`),
  ...repoPolicy.allowedPaths.tools.map(p => `tools/${p}`)
];

// Find all directories
const allDirs = glob.sync('**/', { ignore: ['node_modules/**', '.git/**', '.cortex/**'] });

let valid = true;

for (const dir of allDirs) {
  const isAllowed = allowedDirs.some(allowed => 
    dir.startsWith(allowed + '/') || dir === allowed + '/'
  );
  
  if (!isAllowed && !['apps/', 'packages/', 'services/', 'libs/', 'tools/', 'docs/', '.github/'].includes(dir)) {
    console.error(`❌ Unauthorized directory: ${dir}`);
    valid = false;
  }
}

// Check file types
const blockedPattern = repoPolicy.fileTypes.blocked.join('|').replace(/\*/g, '.*');
const blockedFiles = glob.sync('**/*', { 
  ignore: ['node_modules/**', '.git/**'],
  nodir: true 
}).filter(file => new RegExp(blockedPattern).test(file));

if (blockedFiles.length > 0) {
  console.error('❌ Blocked file types found:');
  blockedFiles.forEach(file => console.error(`  ${file}`));
  valid = false;
}

if (!valid) {
  process.exit(1);
}

console.log('✅ Repository structure is valid');
