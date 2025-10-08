#!/usr/bin/env node

/**
 * brAInwav Cortex-OS Task Manager CLI
 * 
 * Automates task creation following spec-kit inspired workflow with brAInwav standards.
 * 
 * Usage:
 *   pnpm cortex-task init <task-name> [--priority P0|P1|P2|P3]
 *   pnpm cortex-task research <task-id>
 *   pnpm cortex-task plan <task-id>
 *   pnpm cortex-task list
 *   pnpm cortex-task status <task-id>
 * 
 * Co-authored-by: brAInwav Development Team
 */

import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT_DIR = join(__dirname, '..', '..');
const TASKS_DIR = join(ROOT_DIR, 'tasks');
const TEMPLATES_DIR = join(ROOT_DIR, '.cortex', 'templates');

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

const log = {
  info: (msg) => console.log(`${colors.cyan}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  error: (msg) => console.error(`${colors.red}✖${colors.reset} ${msg}`),
  step: (msg) => console.log(`${colors.blue}▸${colors.reset} ${msg}`),
  header: (msg) => console.log(`\n${colors.bright}${colors.magenta}${msg}${colors.reset}\n`),
};

/**
 * Generate task ID slug from task name
 */
const generateTaskId = (taskName) => {
  return taskName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
};

/**
 * Generate feature branch name
 */
const generateBranchName = (taskId, priority = 'P2') => {
  const prefix = priority === 'P0' || priority === 'P1' ? 'feat' : 'feature';
  return `${prefix}/${taskId}`;
};

/**
 * Get current date in YYYY-MM-DD format
 */
const getCurrentDate = () => {
  return new Date().toISOString().split('T')[0];
};

/**
 * Check if git repository
 */
const isGitRepo = () => {
  try {
    execSync('git rev-parse --git-dir', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
};

/**
 * Create git branch
 */
const createGitBranch = (branchName) => {
  try {
    execSync(`git checkout -b ${branchName}`, { stdio: 'inherit' });
    return true;
  } catch (error) {
    log.error(`Failed to create branch: ${error.message}`);
    return false;
  }
};

/**
 * Get current git branch
 */
const getCurrentBranch = () => {
  try {
    return execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf-8' }).trim();
  } catch {
    return 'unknown';
  }
};

/**
 * Read template file and substitute placeholders
 */
const processTemplate = async (templatePath, substitutions) => {
  let content = await readFile(templatePath, 'utf-8');
  
  for (const [key, value] of Object.entries(substitutions)) {
    const regex = new RegExp(`\\[${key}\\]`, 'g');
    content = content.replace(regex, value);
  }
  
  return content;
};

/**
 * Initialize a new task
 */
const initTask = async (taskName, options = {}) => {
  log.header('brAInwav Cortex-OS Task Initialization');
  
  const taskId = generateTaskId(taskName);
  const priority = options.priority || 'P2';
  const date = getCurrentDate();
  
  log.info(`Task Name: ${taskName}`);
  log.info(`Task ID: ${taskId}`);
  log.info(`Priority: ${priority}`);
  
  // Check if tasks directory exists
  if (!existsSync(TASKS_DIR)) {
    await mkdir(TASKS_DIR, { recursive: true });
    log.success('Created tasks directory');
  }
  
  // Check if task already exists
  const specPath = join(TASKS_DIR, `${taskId}-spec.md`);
  if (existsSync(specPath)) {
    log.error(`Task ${taskId} already exists!`);
    process.exit(1);
  }
  
  // Create git branch if in git repo
  let branchName = generateBranchName(taskId, priority);
  if (isGitRepo()) {
    log.step('Creating git branch...');
    const currentBranch = getCurrentBranch();
    
    if (currentBranch !== 'main' && currentBranch !== 'master') {
      log.warn(`Not on main branch (currently on: ${currentBranch})`);
      const response = await promptUser('Continue anyway? (y/n): ');
      if (response.toLowerCase() !== 'y') {
        log.info('Aborted');
        process.exit(0);
      }
    }
    
    createGitBranch(branchName);
  } else {
    log.warn('Not in a git repository - skipping branch creation');
  }
  
  // Create spec from template
  log.step('Creating feature specification...');
  const specTemplate = join(TEMPLATES_DIR, 'feature-spec-template.md');
  
  if (!existsSync(specTemplate)) {
    log.error(`Template not found: ${specTemplate}`);
    log.info('Please ensure .cortex/templates/ exists with feature-spec-template.md');
    process.exit(1);
  }
  
  const specContent = await processTemplate(specTemplate, {
    'FEATURE_NAME': taskName,
    'task-id-slug': taskId,
    'YYYY-MM-DD': date,
    'P0/P1/P2/P3': priority,
  });
  
  await writeFile(specPath, specContent);
  log.success(`Created: ${specPath}`);
  
  // Create initial research file
  log.step('Creating research document...');
  const researchPath = join(TASKS_DIR, `${taskId}.research.md`);
  const researchTemplate = join(TEMPLATES_DIR, 'research-template.md');
  
  const researchContent = await processTemplate(researchTemplate, {
    'FEATURE_NAME': taskName,
    'task-id-slug': taskId,
    'YYYY-MM-DD': date,
  });
  
  await writeFile(researchPath, researchContent);
  log.success(`Created: ${researchPath}`);
  
  // Summary
  log.header('Task Initialized Successfully! 🎉');
  console.log(`
${colors.bright}Next Steps:${colors.reset}

1. ${colors.cyan}Research Phase${colors.reset}
   Edit: ${colors.dim}${researchPath}${colors.reset}
   - Document current state observations
   - Research technology options
   - Identify brAInwav-specific constraints
   
2. ${colors.cyan}Specification Phase${colors.reset}
   Edit: ${colors.dim}${specPath}${colors.reset}
   - Define prioritized user stories (P0/P1/P2/P3)
   - Write acceptance criteria (Given-When-Then)
   - Document requirements and constraints
   
3. ${colors.cyan}Planning Phase${colors.reset}
   Run: ${colors.dim}pnpm cortex-task plan ${taskId}${colors.reset}
   - Create TDD plan based on research and spec
   
4. ${colors.cyan}Implementation Phase${colors.reset}
   - Follow TDD: Write tests first (RED)
   - Implement to make tests pass (GREEN)
   - Refactor while maintaining green (REFACTOR)

${colors.bright}Current Status:${colors.reset}
Branch: ${colors.green}${branchName}${colors.reset}
Task ID: ${colors.green}${taskId}${colors.reset}
Priority: ${colors.green}${priority}${colors.reset}
  `);
};

/**
 * Create TDD plan from research and spec
 */
const createPlan = async (taskId) => {
  log.header('brAInwav Cortex-OS TDD Plan Creation');
  
  const researchPath = join(TASKS_DIR, `${taskId}.research.md`);
  const specPath = join(TASKS_DIR, `${taskId}-spec.md`);
  const planPath = join(TASKS_DIR, `${taskId}-tdd-plan.md`);
  
  // Verify prerequisites
  if (!existsSync(researchPath)) {
    log.error(`Research document not found: ${researchPath}`);
    log.info('Please complete research phase first');
    process.exit(1);
  }
  
  if (!existsSync(specPath)) {
    log.error(`Specification not found: ${specPath}`);
    log.info('Please create specification first');
    process.exit(1);
  }
  
  if (existsSync(planPath)) {
    log.warn(`TDD plan already exists: ${planPath}`);
    const response = await promptUser('Overwrite? (y/n): ');
    if (response.toLowerCase() !== 'y') {
      log.info('Aborted');
      process.exit(0);
    }
  }
  
  log.step('Reading research and specification...');
  const research = await readFile(researchPath, 'utf-8');
  const spec = await readFile(specPath, 'utf-8');
  
  // Extract feature name from spec
  const featureNameMatch = spec.match(/# Feature Specification: (.+)/);
  const featureName = featureNameMatch ? featureNameMatch[1] : taskId;
  
  log.step('Creating TDD plan from template...');
  const planTemplate = join(TEMPLATES_DIR, 'tdd-plan-template.md');
  
  const planContent = await processTemplate(planTemplate, {
    'FEATURE_NAME': featureName,
    'task-id-slug': taskId,
    'YYYY-MM-DD': getCurrentDate(),
  });
  
  await writeFile(planPath, planContent);
  log.success(`Created: ${planPath}`);
  
  // Guidance
  log.header('TDD Plan Created! 📝');
  console.log(`
${colors.bright}Next Steps:${colors.reset}

1. ${colors.cyan}Review and Customize${colors.reset}
   Edit: ${colors.dim}${planPath}${colors.reset}
   - Fill in specific test cases based on spec
   - Define implementation checklist
   - Document architecture decisions
   
2. ${colors.cyan}Write Tests First (RED)${colors.reset}
   - Create failing tests for all scenarios
   - Get stakeholder approval
   - Verify all tests are RED
   
3. ${colors.cyan}Implement (GREEN)${colors.reset}
   - Write minimal code to pass tests
   - Follow checklist in TDD plan
   - Keep functions ≤40 lines
   
4. ${colors.cyan}Refactor (REFACTOR)${colors.reset}
   - Improve code quality
   - Keep tests GREEN
   - Run quality gates

${colors.bright}Quality Gates:${colors.reset}
- Run: ${colors.dim}pnpm lint:smart${colors.reset}
- Run: ${colors.dim}pnpm test:smart${colors.reset}
- Run: ${colors.dim}pnpm security:scan${colors.reset}
- Run: ${colors.dim}pnpm structure:validate${colors.reset}
  `);
};

/**
 * List all tasks
 */
const listTasks = async () => {
  log.header('brAInwav Cortex-OS Tasks');
  
  if (!existsSync(TASKS_DIR)) {
    log.warn('No tasks directory found');
    return;
  }
  
  const files = await readdir(TASKS_DIR);
  const specs = files.filter(f => f.endsWith('-spec.md'));
  
  if (specs.length === 0) {
    log.info('No tasks found');
    return;
  }
  
  console.log(`\n${colors.bright}Total Tasks: ${specs.length}${colors.reset}\n`);
  
  for (const spec of specs) {
    const taskId = spec.replace('-spec.md', '');
    const specPath = join(TASKS_DIR, spec);
    const researchPath = join(TASKS_DIR, `${taskId}.research.md`);
    const planPath = join(TASKS_DIR, `${taskId}-tdd-plan.md`);
    
    const content = await readFile(specPath, 'utf-8');
    const priorityMatch = content.match(/\*\*Priority\*\*: (P[0-3])/);
    const priority = priorityMatch ? priorityMatch[1] : 'Unknown';
    
    const statusMatch = content.match(/\*\*Status\*\*: (.+)/);
    const status = statusMatch ? statusMatch[1] : 'Unknown';
    
    const hasResearch = existsSync(researchPath) ? '✓' : '○';
    const hasPlan = existsSync(planPath) ? '✓' : '○';
    
    const priorityColor = 
      priority === 'P0' ? colors.red :
      priority === 'P1' ? colors.yellow :
      priority === 'P2' ? colors.blue :
      colors.dim;
    
    console.log(`${priorityColor}${priority}${colors.reset} ${colors.bright}${taskId}${colors.reset}`);
    console.log(`   Status: ${status}`);
    console.log(`   Research: ${hasResearch}  Plan: ${hasPlan}`);
    console.log('');
  }
};

/**
 * Show task status
 */
const showStatus = async (taskId) => {
  log.header(`Task Status: ${taskId}`);
  
  const specPath = join(TASKS_DIR, `${taskId}-spec.md`);
  const researchPath = join(TASKS_DIR, `${taskId}.research.md`);
  const planPath = join(TASKS_DIR, `${taskId}-tdd-plan.md`);
  
  if (!existsSync(specPath)) {
    log.error(`Task not found: ${taskId}`);
    process.exit(1);
  }
  
  const spec = await readFile(specPath, 'utf-8');
  
  // Extract metadata
  const featureNameMatch = spec.match(/# Feature Specification: (.+)/);
  const priorityMatch = spec.match(/\*\*Priority\*\*: (P[0-3])/);
  const statusMatch = spec.match(/\*\*Status\*\*: (.+)/);
  const branchMatch = spec.match(/\*\*Feature Branch\*\*: `(.+)`/);
  
  const featureName = featureNameMatch ? featureNameMatch[1] : taskId;
  const priority = priorityMatch ? priorityMatch[1] : 'Unknown';
  const status = statusMatch ? statusMatch[1] : 'Unknown';
  const branch = branchMatch ? branchMatch[1] : 'Unknown';
  
  console.log(`${colors.bright}Feature:${colors.reset} ${featureName}`);
  console.log(`${colors.bright}Priority:${colors.reset} ${priority}`);
  console.log(`${colors.bright}Status:${colors.reset} ${status}`);
  console.log(`${colors.bright}Branch:${colors.reset} ${branch}`);
  console.log('');
  
  // Workflow progress
  console.log(`${colors.bright}Workflow Progress:${colors.reset}`);
  console.log(`  ${existsSync(specPath) ? colors.green + '✓' : colors.dim + '○'}${colors.reset} Specification created`);
  console.log(`  ${existsSync(researchPath) ? colors.green + '✓' : colors.dim + '○'}${colors.reset} Research completed`);
  console.log(`  ${existsSync(planPath) ? colors.green + '✓' : colors.dim + '○'}${colors.reset} TDD plan created`);
  console.log('');
  
  // Files
  console.log(`${colors.bright}Files:${colors.reset}`);
  if (existsSync(specPath)) console.log(`  ${colors.cyan}Spec:${colors.reset} ${specPath}`);
  if (existsSync(researchPath)) console.log(`  ${colors.cyan}Research:${colors.reset} ${researchPath}`);
  if (existsSync(planPath)) console.log(`  ${colors.cyan}Plan:${colors.reset} ${planPath}`);
  console.log('');
};

/**
 * Simple prompt for user input
 */
const promptUser = (question) => {
  return new Promise((resolve) => {
    process.stdout.write(question);
    process.stdin.once('data', (data) => {
      resolve(data.toString().trim());
    });
  });
};

/**
 * Main CLI entrypoint
 */
const main = async () => {
  const args = process.argv.slice(2);
  const command = args[0];
  
  if (!command) {
    console.log(`
${colors.bright}${colors.magenta}brAInwav Cortex-OS Task Manager${colors.reset}

${colors.bright}Usage:${colors.reset}
  pnpm cortex-task init <task-name> [--priority P0|P1|P2|P3]
  pnpm cortex-task research <task-id>
  pnpm cortex-task plan <task-id>
  pnpm cortex-task list
  pnpm cortex-task status <task-id>

${colors.bright}Commands:${colors.reset}
  ${colors.cyan}init${colors.reset}      Initialize a new task with spec and research files
  ${colors.cyan}plan${colors.reset}      Create TDD plan from research and spec
  ${colors.cyan}list${colors.reset}      List all tasks
  ${colors.cyan}status${colors.reset}    Show detailed status of a task

${colors.bright}Examples:${colors.reset}
  pnpm cortex-task init "OAuth authentication" --priority P1
  pnpm cortex-task plan oauth-authentication
  pnpm cortex-task status oauth-authentication
  pnpm cortex-task list

${colors.dim}Co-authored-by: brAInwav Development Team${colors.reset}
    `);
    process.exit(0);
  }
  
  try {
    switch (command) {
      case 'init': {
        const taskName = args.slice(1).filter(a => !a.startsWith('--')).join(' ');
        if (!taskName) {
          log.error('Task name required');
          process.exit(1);
        }
        
        const priorityIndex = args.indexOf('--priority');
        const priority = priorityIndex !== -1 ? args[priorityIndex + 1] : undefined;
        
        await initTask(taskName, { priority });
        break;
      }
      
      case 'research': {
        const taskId = args[1];
        if (!taskId) {
          log.error('Task ID required');
          process.exit(1);
        }
        log.info(`Opening research document for: ${taskId}`);
        log.info(`Edit: tasks/${taskId}.research.md`);
        break;
      }
      
      case 'plan': {
        const taskId = args[1];
        if (!taskId) {
          log.error('Task ID required');
          process.exit(1);
        }
        await createPlan(taskId);
        break;
      }
      
      case 'list': {
        await listTasks();
        break;
      }
      
      case 'status': {
        const taskId = args[1];
        if (!taskId) {
          log.error('Task ID required');
          process.exit(1);
        }
        await showStatus(taskId);
        break;
      }
      
      default:
        log.error(`Unknown command: ${command}`);
        log.info('Run "pnpm cortex-task" for usage information');
        process.exit(1);
    }
  } catch (error) {
    log.error(`Error: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
};

// Run CLI
main();
