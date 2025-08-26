#!/usr/bin/env -S deno run --allow-all
/**
 * @file Simple CLI - Refactored Version
 * @description Modular CLI dispatcher for Claude-Flow
 * @refactored_from simple-cli.ts (3,452 lines → ~150 lines)
 * @version 2.0.0
 */

import { CLICommandRegistry } from './cli/command-registry.js';
import { CLIHelpSystem } from './cli/help-system.js';
import { CLIUtilities } from './cli/utilities.js';

/**
 * Main CLI entry point - dramatically simplified from original 3,452 lines
 */
async function main(): Promise<void> {
  const args = Deno.args;

  // Show help if no arguments provided
  if (args.length === 0) {
    CLIHelpSystem.printMainHelp();
    return;
  }

  const command = args[0];
  const { flags, args: parsedArgs } = CLIUtilities.parseFlags(args.slice(1));

  // Handle special built-in commands first
  if (await handleBuiltInCommands(command, parsedArgs, flags)) {
    return;
  }

  // Delegate to command registry for modular commands
  if (CLICommandRegistry.hasCommand(command)) {
    try {
      await CLICommandRegistry.executeCommand(command, parsedArgs, flags);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      CLIUtilities.printError(message);
      process.exit(1);
    }
    return;
  }

  // Command not found
  CLIUtilities.printError(`Unknown command: ${command}`);
  console.log('\nAvailable commands:');
  CLICommandRegistry.showAllCommands();
  process.exit(1);
}

/**
 * Handle built-in commands that don't require registration
 */
async function handleBuiltInCommands(
  command: string, 
  args: string[], 
  flags: any
): Promise<boolean> {
  switch (command) {
    case 'version':
    case '--version':
    case '-v':
      CLIHelpSystem.printVersion();
      return true;

    case 'help':
    case '--help':
    case '-h':
      if (args.length > 0) {
        CLICommandRegistry.showCommandHelp(args[0]);
      } else {
        CLIHelpSystem.showHelpWithCommands();
      }
      return true;

    default:
      return false;
  }
}

/**
 * Handle uncaught errors gracefully
 */
process.on('uncaughtException', (error: Error) => {
  CLIUtilities.printError(`Uncaught exception: ${error.message}`);
  if (CLIUtilities.isVerbose({ verbose: true })) {
    console.error(error.stack);
  }
  process.exit(1);
});

/**
 * Handle unhandled promise rejections gracefully
 */
process.on('unhandledRejection', (reason: unknown) => {
  const message = reason instanceof Error ? reason.message : String(reason);
  CLIUtilities.printError(`Unhandled promise rejection: ${message}`);
  process.exit(1);
});

/**
 * Handle SIGINT (Ctrl+C) gracefully
 */
process.on('SIGINT', () => {
  console.log('\n👋 Claude-Flow CLI terminated by user');
  process.exit(0);
});

// Run main function if this file is executed directly
if (import.meta.main) {
  main().catch((error: Error) => {
    CLIUtilities.printError(`CLI execution failed: ${error.message}`);
    process.exit(1);
  });
}