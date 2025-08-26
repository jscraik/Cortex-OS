/**
 * @file CLI Command Registry
 * @description Modular command registration and execution system
 * @split_from simple-cli.ts
 */

import { CLIUtilities } from './utilities.js';
import type { CLICommand, CLIFlags, CommandRegistry } from './types/index.js';

export class CLICommandRegistry {
  private static commands: CommandRegistry = {};
  private static initialized = false;

  /**
   * Initialize the command registry with built-in commands
   */
  static initialize(): void {
    if (this.initialized) return;
    
    // Import and register command modules
    this.loadCommandModules();
    this.initialized = true;
  }

  /**
   * Register a command with the registry
   */
  static registerCommand(command: CLICommand): void {
    this.commands[command.name] = command;
    
    // Register aliases
    if (command.aliases) {
      command.aliases.forEach(alias => {
        this.commands[alias] = command;
      });
    }
  }

  /**
   * Check if a command exists
   */
  static hasCommand(commandName: string): boolean {
    this.initialize();
    return commandName in this.commands;
  }

  /**
   * Execute a registered command
   */
  static async executeCommand(
    commandName: string, 
    args: string[], 
    flags: CLIFlags
  ): Promise<void> {
    this.initialize();
    
    const command = this.commands[commandName];
    if (!command) {
      throw new Error(`Unknown command: ${commandName}`);
    }

    try {
      await command.handler(args, flags);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Command '${commandName}' failed: ${message}`);
    }
  }

  /**
   * Show help for a specific command
   */
  static showCommandHelp(commandName: string): void {
    this.initialize();
    
    const command = this.commands[commandName];
    if (!command) {
      CLIUtilities.printError(`Unknown command: ${commandName}`);
      return;
    }

    console.log(`\n📖 Help for command: ${command.name}`);
    console.log(`Description: ${command.description}`);
    
    if (command.aliases && command.aliases.length > 0) {
      console.log(`Aliases: ${command.aliases.join(', ')}`);
    }
    
    if (command.help) {
      console.log(command.help);
    } else {
      console.log('\nNo detailed help available for this command.');
    }
  }

  /**
   * List all registered commands
   */
  static listCommands(): Array<{ name: string; description: string }> {
    this.initialize();
    
    const commandList: Array<{ name: string; description: string }> = [];
    const seen = new Set<string>();
    
    Object.values(this.commands).forEach(command => {
      if (!seen.has(command.name)) {
        commandList.push({
          name: command.name,
          description: command.description
        });
        seen.add(command.name);
      }
    });
    
    return commandList.sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Show all available commands
   */
  static showAllCommands(): void {
    console.log('\n📋 Available Commands:');
    const commands = this.listCommands();
    
    for (const command of commands) {
      console.log(`  ${command.name.padEnd(15)} ${command.description}`);
    }
    
    console.log('\nUse "claude-flow help <command>" for detailed usage information');
  }

  /**
   * Load command modules dynamically
   */
  private static loadCommandModules(): void {
    // Register built-in commands that were in the original switch statement
    this.registerBuiltInCommands();
    
    // Register specialized command modules
    this.registerSpecializedCommands();
  }

  /**
   * Register built-in commands from the original CLI
   */
  private static registerBuiltInCommands(): void {
    // Status command
    this.registerCommand({
      name: 'status',
      description: 'Show comprehensive system status',
      handler: this.handleStatusCommand,
      help: 'Display system status including agents, memory, and performance metrics'
    });

    // Monitor command
    this.registerCommand({
      name: 'monitor',
      description: 'Start real-time system monitoring',
      handler: this.handleMonitorCommand,
      help: 'Start real-time monitoring of system performance and agent activity'
    });

    // Spawn command
    this.registerCommand({
      name: 'spawn',
      description: 'Create a new AI agent',
      handler: this.handleSpawnCommand,
      help: 'Spawn a new AI agent with specified type and configuration'
    });
  }

  /**
   * Handle status command
   */
  private static handleStatusCommand = async (args: string[], flags: CLIFlags): Promise<void> => {
    CLIUtilities.printSuccess("Claude-Flow System Status:");
    console.log("🟡 Status: Not Running (orchestrator not started)");
    console.log("🤖 Agents: 0 active");
    console.log("📋 Tasks: 0 in queue");
    console.log("💾 Memory: Ready");
    console.log("🖥️  Terminal Pool: Ready");
    console.log("🌐 MCP Server: Stopped");

    if (CLIUtilities.isVerbose(flags)) {
      console.log("\n📊 Detailed Information:");
      console.log("   System Health: Healthy");
      console.log("   Uptime: 0s");
      console.log("   Memory Usage: 0 MB");
      console.log("   CPU Usage: 0%");
      console.log("   Network Status: Ready");
    }
  };

  /**
   * Handle monitor command
   */
  private static handleMonitorCommand = async (args: string[], flags: CLIFlags): Promise<void> => {
    CLIUtilities.printSuccess("Starting system monitor...");
    console.log("📊 Real-time monitoring would display here");
    
    if (flags.watch) {
      console.log("⏱️  Monitoring mode: Continuous");
      console.log("🔄 Press Ctrl+C to stop monitoring");
    }
  };

  /**
   * Handle spawn command
   */
  private static handleSpawnCommand = async (args: string[], flags: CLIFlags): Promise<void> => {
    const spawnType = args[0] || "general";
    const spawnName = flags.name as string || `agent-${Date.now()}`;

    CLIUtilities.printSuccess(`Spawning ${spawnType} agent: ${spawnName}`);
    console.log("🤖 Agent would be created with the following configuration:");
    console.log(`   Type: ${spawnType}`);
    console.log(`   Name: ${spawnName}`);
    console.log("   Capabilities: Research, Analysis, Code Generation");
    console.log("   Status: Ready");
    console.log("\n📋 Note: Full agent spawning requires orchestrator to be running");
  };

  /**
   * Register specialized command modules
   */
  private static registerSpecializedCommands(): void {
    // Import and register terminal commands
    try {
      const { TerminalCommands } = require('./commands/terminal-commands.js');
      this.registerCommand(TerminalCommands.getCommand());
    } catch (error) {
      // Terminal commands module not available - skip registration
      console.warn('Terminal commands module not available');
    }
  }
}