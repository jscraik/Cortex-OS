/**
 * @file CLI Type Definitions
 * @description Shared types for the CLI system
 */

export interface CLIFlags {
  [key: string]: string | boolean | number;
}

export interface CLICommand {
  name: string;
  description: string;
  handler: (args: string[], flags: CLIFlags) => Promise<void> | void;
  help?: string;
  aliases?: string[];
}

export interface CLIContext {
  args: string[];
  flags: CLIFlags;
  command: string;
}

export interface CommandRegistry {
  [commandName: string]: CLICommand;
}

export interface ParsedFlags {
  flags: CLIFlags;
  args: string[];
}