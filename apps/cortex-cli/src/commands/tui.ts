import { spawn } from 'child_process';
import { Command } from 'commander';
import fs from 'fs';
import path from 'path';

export const tuiCommand = new Command('tui')
  .description('Launch the Cortex TUI (Terminal User Interface)')
  .option('--ci', 'Run in CI mode (non-interactive)')
  .option('--config <path>', 'Path to config file')
  .option('--debug', 'Enable debug logging')
  .argument('[prompt]', 'Prompt to execute (for CI mode)')
  .action(async (prompt, options) => {
    const tuiPath = path.join(__dirname, '../../../cortex-tui/target/release/cortex-tui');
    const tuiBinPath = path.join(__dirname, '../../../bin/cortex-tui');

    // Check if TUI binary exists
    let execPath = tuiPath;
    if (!fs.existsSync(tuiPath)) {
      if (fs.existsSync(tuiBinPath)) {
        execPath = tuiBinPath;
      } else {
        console.error('❌ Cortex TUI not found. Please build it first:');
        console.error('   cd apps/cortex-tui && ./build.sh');
        process.exit(1);
      }
    }

    // Build command arguments
    const args: string[] = [];

    if (prompt) {
      args.push('run', prompt);
    } else {
      args.push('tui');
    }

    if (options.ci) {
      args.push('--ci');
    }

    if (options.config) {
      args.push('--config', options.config);
    }

    if (options.debug) {
      args.push('--debug');
    }

    // Launch TUI
    console.log(`🦀 Launching Cortex TUI...`);
    const child = spawn(execPath, args, {
      stdio: 'inherit',
      env: process.env,
    });

    child.on('exit', (code) => {
      process.exit(code || 0);
    });

    child.on('error', (error) => {
      console.error('❌ Failed to launch TUI:', error.message);
      process.exit(1);
    });
  });
