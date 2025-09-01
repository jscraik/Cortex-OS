/**
 * Command parsing utilities for GitHub comments
 * Pure functions for parsing @cortex commands
 */

import type { AITaskType, CommentTrigger } from '../types/github-models.js';

export interface ParsedCommand {
  taskType: AITaskType;
  instructions?: string;
  trigger: CommentTrigger;
}

export interface CommandParseResult {
  command?: ParsedCommand;
  error?: string;
}

export const parseGitHubComment = (
  comment: string,
  triggers: CommentTrigger[]
): CommandParseResult => {
  if (!comment || !comment.includes('@cortex')) {
    return { error: 'No @cortex command found' };
  }

  for (const trigger of triggers) {
    const match = comment.match(trigger.pattern);
    if (match) {
      const instructions = match[1]?.trim();

      return {
        command: {
          taskType: trigger.taskType,
          instructions: instructions || undefined,
          trigger,
        }
      };
    }
  }

  return { error: 'Unknown @cortex command' };
};

export const listAvailableCommands = (triggers: CommentTrigger[]): string => {
  return triggers
    .map(trigger => `- \`@cortex ${trigger.taskType.replace('_', ' ')}\` - ${trigger.description}`)
    .join('\n');
};

export const validateUserPermissions = (
  command: ParsedCommand,
  userPermissions: string[]
): boolean => {
  return command.trigger.requiredPermissions.every(perm =>
    userPermissions.includes(perm) || userPermissions.includes('admin')
  );
};

export const createCommandParser = (triggers: CommentTrigger[]) => ({
  parseComment: (comment: string) => parseGitHubComment(comment, triggers),
  listAvailableCommands: () => listAvailableCommands(triggers),
  validatePermissions: (command: ParsedCommand, userPermissions: string[]) =>
    validateUserPermissions(command, userPermissions),
});
