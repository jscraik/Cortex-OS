import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { Command } from "commander";

export const codeCommand = new Command('code')
  .description('Launch the Cortex Code interface')
  .option('--ci', 'Run in CI mode (non-interactive)')
  .option('--config <path>', 'Path to config file')
  .option('--debug', 'Enable debug logging')
  .argument('[prompt]', 'Prompt to execute (for CI mode)')
  .action(async (prompt, options) => {
    // Updated to match Rust binary name (codex)
    const codePath = path.join(__dirname, '../../../cortex-code/target/release/codex');
    const codeBinPath = path.join(__dirname, '../../../bin/codex');
    const homeBin = process.env.HOME ? path.join(process.env.HOME, '.cargo/bin/codex') : null;

    // Check if Code binary exists
    let execPath = codePath;
    if (!fs.existsSync(codePath)) {
      if (fs.existsSync(codeBinPath)) {
        execPath = codeBinPath;
      } else if (homeBin && fs.existsSync(homeBin)) {
        execPath = homeBin;
      } else {
        console.error('❌ Cortex Code binary not found. Please build or install it first:');
        console.error('   cd apps/cortex-code && cargo build --release');
        console.error('   # or install to PATH:');
        console.error('   cd apps/cortex-code && cargo install --path .');
        process.exit(1);
      }
    }

		// Build command arguments
		const args: string[] = [];

    if (prompt) {
      args.push('run', prompt);
    } else {
      args.push('code');
    }

		if (options.ci) {
			args.push("--ci");
		}

		if (options.config) {
			args.push("--config", options.config);
		}

		if (options.debug) {
			args.push("--debug");
		}

    // Launch Cortex Code
    console.log(`🦀 Launching Cortex Code...`);
    const child = spawn(execPath, args, {
      stdio: 'inherit',
      env: process.env,
    });

		child.on("exit", (code) => {
			process.exit(code || 0);
		});

    child.on('error', (error) => {
      console.error('❌ Failed to launch Cortex Code:', error.message);
      process.exit(1);
    });
  });
