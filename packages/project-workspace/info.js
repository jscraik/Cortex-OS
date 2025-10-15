#!/usr/bin/env node

import { readdir, stat } from 'fs/promises';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

async function countFiles(dirPath) {
  try {
    const entries = await readdir(dirPath, { withFileTypes: true });
    let fileCount = 0;
    let dirCount = 0;

    for (const entry of entries) {
      if (entry.isFile()) fileCount++;
      else if (entry.isDirectory()) dirCount++;
    }

    return { files: fileCount, dirs: dirCount };
  } catch (error) {
    return { files: 0, dirs: 0, error: true };
  }
}

async function main() {
  console.log(`\n${COLORS.bright}${COLORS.cyan}╔═══════════════════════════════════════════════════════════╗${COLORS.reset}`);
  console.log(`${COLORS.bright}${COLORS.cyan}║          Cortex-OS Project Workspace Info                 ║${COLORS.reset}`);
  console.log(`${COLORS.bright}${COLORS.cyan}╚═══════════════════════════════════════════════════════════╝${COLORS.reset}\n`);

  const workspaceRoot = join(__dirname, '../..');
  const directories = [
    { name: '.cortex', path: join(workspaceRoot, '.cortex'), desc: 'Project Configuration & Governance' },
    { name: '.github', path: join(workspaceRoot, '.github'), desc: 'GitHub Configuration' },
    { name: 'tasks', path: join(workspaceRoot, 'tasks'), desc: 'Active Tasks & Planning' },
    { name: 'project-documentation', path: join(workspaceRoot, 'project-documentation'), desc: 'Project Documentation' },
  ];

  console.log(`${COLORS.bright}📂 Accessible Directories:${COLORS.reset}\n`);

  for (const dir of directories) {
    const counts = await countFiles(dir.path);
    const status = counts.error ? `${COLORS.yellow}[NOT FOUND]${COLORS.reset}` : `${COLORS.green}[OK]${COLORS.reset}`;
    
    console.log(`${COLORS.bright}${status} ${COLORS.blue}${dir.name}${COLORS.reset}`);
    console.log(`   ${dir.desc}`);
    
    if (!counts.error) {
      console.log(`   ${COLORS.cyan}└─${COLORS.reset} ${counts.files} files, ${counts.dirs} directories`);
    }
    
    console.log();
  }

  console.log(`${COLORS.bright}💡 Quick Access:${COLORS.reset}\n`);
  console.log(`   cd ${COLORS.cyan}../../.cortex${COLORS.reset}`);
  console.log(`   cd ${COLORS.cyan}../../.github${COLORS.reset}`);
  console.log(`   cd ${COLORS.cyan}../../tasks${COLORS.reset}`);
  console.log(`   cd ${COLORS.cyan}../../project-documentation${COLORS.reset}\n`);

  console.log(`${COLORS.bright}🔍 Search Across All:${COLORS.reset}\n`);
  console.log(`   ${COLORS.green}grep -r "search-term" ../../.cortex${COLORS.reset}`);
  console.log(`   ${COLORS.green}rg "search-term" ../../tasks${COLORS.reset}\n`);
}

main().catch(console.error);
