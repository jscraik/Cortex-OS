import { z } from 'zod';

// Validation schemas for different types of input
export const idSchema = z
  .string()
  .min(1)
  .max(100)
  .regex(/^[a-zA-Z0-9_-]+$/);
export const namespaceSchema = z
  .string()
  .min(1)
  .max(100)
  .regex(/^[a-zA-Z0-9_-]+$/);
export const statusSchema = z
  .string()
  .min(1)
  .max(50)
  .regex(/^[a-zA-Z0-9_-]+$/);
export const keySchema = z
  .string()
  .min(1)
  .max(200)
  .regex(/^[a-zA-Z0-9_-]+$/);

// Database input validation
export const validateDatabaseInput = {
  id: (value: string) => idSchema.safeParse(value),
  namespace: (value: string) => namespaceSchema.safeParse(value),
  status: (value: string) => statusSchema.safeParse(value),
  key: (value: string) => keySchema.safeParse(value),
  // Generic validator for any string input
  string: (value: string, maxLength: number = 1000) =>
    z.string().min(1).max(maxLength).safeParse(value),
};

// Neo4j validation
export const validateNeo4jInput = {
  nodeId: (value: string) => idSchema.safeParse(value),
  label: (value: string) => {
    // Neo4j labels must follow specific rules
    const labelSchema = z
      .string()
      .min(1)
      .max(100)
      .regex(/^[A-Za-z_][A-Za-z0-9_]*$/);
    return labelSchema.safeParse(value);
  },
  type: (value: string) => {
    // Relationship types must follow specific rules
    const typeSchema = z
      .string()
      .min(1)
      .max(100)
      .regex(/^[A-Za-z_][A-Za-z0-9_]*$/);
    return typeSchema.safeParse(value);
  },
};

// Command execution validation
export const validateCommandInput = {
  docker: (command: string[]) => {
    const allowedSubcommands = ['ps', 'images', 'inspect', 'logs'];

    if (command.length < 2) {
      return { success: false, error: 'Invalid command format' };
    }

    if (command[0] !== 'docker') {
      return { success: false, error: 'Only docker commands are allowed' };
    }

    if (!allowedSubcommands.includes(command[1])) {
      return { success: false, error: `Docker subcommand ${command[1]} is not allowed` };
    }

    for (let i = 2; i < command.length; i++) {
      const param = command[i];
      if (param.startsWith('-')) continue;

      const containerIdSchema = z
        .string()
        .min(12)
        .max(64)
        .regex(/^[a-f0-9]+$/);
      const result = containerIdSchema.safeParse(param);
      if (!result.success) {
        return { success: false, error: `Invalid container ID: ${param}` };
      }
    }

    return { success: true };
  },

  generic: (command: string[]) => {
    if (command.length === 0) {
      return { success: false, error: 'Command cannot be empty' };
    }

    for (const part of command) {
      if (part.length > 1000) {
        return { success: false, error: 'Argument too long' };
      }

      if (/[;&|`$(){}[\]<>]/.test(part)) {
        return { success: false, error: `Invalid characters in argument: ${part}` };
      }
    }

    return { success: true };
  },
};
