#!/usr/bin/env tsx
/**
 * @file_path cli/commands/memory-manager.ts
 * @description Memory and Context Management System (QW17) - Persistent fact storage and session state
 * @maintainer @jamiescottcraik
 * @last_updated 2025-08-04
 * @version 1.0.0
 * @status active
 * @quick_win QW17
 */

import chalk from 'chalk';
import { createHash } from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { loadGateConfigFromRepoConfig, shouldGateDestructive } from '../services/sandbox-service';

interface MemoryEntry {
  id: string;
  content: string;
  tags: string[];
  type: 'fact' | 'preference' | 'context' | 'decision';
  timestamp: string;
  source?: string;
  confidence: number;
  expires?: string;
  metadata?: Record<string, any>;
}

interface SessionState {
  id: string;
  startTime: string;
  lastActivity: string;
  currentContext: string[];
  memoryRefs: string[];
  variables: Record<string, any>;
  activeTools: string[];
  workingDirectory: string;
  projectInfo?: {
    name: string;
    type: 'nodejs' | 'python' | 'mixed' | 'unknown';
    packageManager?: string;
    frameworks: string[];
  };
}

interface ContextWindow {
  maxTokens: number;
  currentTokens: number;
  entries: MemoryEntry[];
  priority: 'recent' | 'relevant' | 'important';
  overflow: MemoryEntry[];
}

interface MemoryManagerConfig {
  baseDir?: string;
}

class MemoryManager {
  private memoryDir: string;
  private sessionDir: string;
  private contextDir: string;
  private memoryFile: string;
  private sessionFile: string;
  private currentSession: SessionState | null = null;

  static getDefaultBaseDir(): string {
    return path.join(process.env.HOME || '/tmp', '.cortex-os');
  }

  constructor(config: MemoryManagerConfig = {}) {
    const baseDir = config.baseDir ?? MemoryManager.getDefaultBaseDir();
    this.memoryDir = path.join(baseDir, 'memory');
    this.sessionDir = path.join(baseDir, 'sessions');
    this.contextDir = path.join(baseDir, 'context');
    this.memoryFile = path.join(this.memoryDir, 'memory.json');
    this.sessionFile = path.join(this.sessionDir, 'current-session.json');
  }

  // Memory Management
  async initializeMemory(): Promise<void> {
    await fs.mkdir(this.memoryDir, { recursive: true });
    await fs.mkdir(this.sessionDir, { recursive: true });
    await fs.mkdir(this.contextDir, { recursive: true });

    // Create memory file if it doesn't exist
    try {
      await fs.access(this.memoryFile);
    } catch {
      await fs.writeFile(
        this.memoryFile,
        JSON.stringify({ entries: [], version: '1.0.0' }, null, 2),
      );
    }
  }

  async saveMemory(
    content: string,
    options: {
      tags?: string[];
      type?: MemoryEntry['type'];
      source?: string;
      confidence?: number;
      expires?: Date;
      metadata?: Record<string, any>;
    } = {},
  ): Promise<string> {
    await this.initializeMemory();

    const entry: MemoryEntry = {
      id: this.generateId(content),
      content: content.trim(),
      tags: options.tags || [],
      type: options.type || 'fact',
      timestamp: new Date().toISOString(),
      source: options.source,
      confidence: options.confidence || 0.8,
      expires: options.expires?.toISOString(),
      metadata: options.metadata,
    };

    // Load existing memories
    const memoryData = await this.loadMemoryData();

    // Check for duplicates
    const existingIndex = memoryData.entries.findIndex((e) => e.id === entry.id);
    if (existingIndex >= 0) {
      // Update existing entry
      memoryData.entries[existingIndex] = {
        ...memoryData.entries[existingIndex],
        ...entry,
      };
    } else {
      // Add new entry
      memoryData.entries.push(entry);
    }

    // Sort by timestamp (most recent first)
    memoryData.entries.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );

    // Cleanup expired entries
    await this.cleanupExpiredMemories(memoryData);

    // Save updated memories
    await fs.writeFile(this.memoryFile, JSON.stringify(memoryData, null, 2));

    return entry.id;
  }

  async searchMemory(
    query: string,
    options: {
      tags?: string[];
      type?: MemoryEntry['type'];
      limit?: number;
      confidence?: number;
    } = {},
  ): Promise<MemoryEntry[]> {
    const memoryData = await this.loadMemoryData();
    const queryLower = query.toLowerCase();

    let results = memoryData.entries.filter((entry) => {
      // Content match
      const contentMatch = entry.content.toLowerCase().includes(queryLower);

      // Tag match
      const tagMatch =
        !options.tags ||
        options.tags.some((tag) =>
          entry.tags.some((entryTag) => entryTag.toLowerCase().includes(tag.toLowerCase())),
        );

      // Type match
      const typeMatch = !options.type || entry.type === options.type;

      // Confidence threshold
      const confidenceMatch = !options.confidence || entry.confidence >= options.confidence;

      // Not expired
      const notExpired = !entry.expires || new Date(entry.expires) > new Date();

      return contentMatch && tagMatch && typeMatch && confidenceMatch && notExpired;
    });

    // Sort by relevance (basic scoring)
    results = results
      .map((entry) => ({
        ...entry,
        relevanceScore: this.calculateRelevanceScore(entry, query),
      }))
      .sort((a: any, b: any) => b.relevanceScore - a.relevanceScore);

    return results.slice(0, options.limit || 10);
  }

  async deleteMemory(id: string): Promise<boolean> {
    const memoryData = await this.loadMemoryData();
    const initialCount = memoryData.entries.length;

    memoryData.entries = memoryData.entries.filter((entry) => entry.id !== id);

    if (memoryData.entries.length < initialCount) {
      await fs.writeFile(this.memoryFile, JSON.stringify(memoryData, null, 2));
      return true;
    }

    return false;
  }

  async listMemories(
    options: {
      type?: MemoryEntry['type'];
      tags?: string[];
      limit?: number;
      recent?: boolean;
    } = {},
  ): Promise<MemoryEntry[]> {
    const memoryData = await this.loadMemoryData();

    let results = memoryData.entries.filter((entry) => {
      const typeMatch = !options.type || entry.type === options.type;
      const tagMatch = !options.tags || options.tags.some((tag) => entry.tags.includes(tag));
      const notExpired = !entry.expires || new Date(entry.expires) > new Date();

      return typeMatch && tagMatch && notExpired;
    });

    if (options.recent) {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 7); // Last 7 days
      results = results.filter((entry) => new Date(entry.timestamp) > cutoff);
    }

    return results.slice(0, options.limit || 20);
  }

  // Session Management
  async startSession(workingDirectory: string = process.cwd()): Promise<string> {
    const sessionId = this.generateSessionId();

    this.currentSession = {
      id: sessionId,
      startTime: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
      currentContext: [],
      memoryRefs: [],
      variables: {},
      activeTools: [],
      workingDirectory,
      projectInfo: await this.analyzeProject(workingDirectory),
    };

    await this.saveSession();
    return sessionId;
  }

  async updateSession(updates: Partial<SessionState>): Promise<void> {
    if (!this.currentSession) {
      throw new Error('No active session. Start a session first.');
    }

    this.currentSession = {
      ...this.currentSession,
      ...updates,
      lastActivity: new Date().toISOString(),
    };

    await this.saveSession();
  }

  async endSession(): Promise<void> {
    if (!this.currentSession) return;

    // Sandbox gating: avoid destructive archive/delete if environment risk is too high
    try {
      const cfg = await loadGateConfigFromRepoConfig();
      const { gate, risk } = await shouldGateDestructive(async () => cfg);
      if (cfg.enabled && gate) {
        console.warn(
          chalk.red(
            `Sandbox gate blocked session end (risk ${risk.score.toFixed(0)} >= threshold ${cfg.threshold}). ` +
              `Adjust security.sandboxGate in cortex-config.json to proceed.`,
          ),
        );
        return;
      }
    } catch {}

    // Archive current session
    const archiveFile = path.join(this.sessionDir, `session-${this.currentSession.id}.json`);
    await fs.writeFile(archiveFile, JSON.stringify(this.currentSession, null, 2));

    // Clear current session
    this.currentSession = null;

    try {
      await fs.unlink(this.sessionFile);
    } catch {
      // File might not exist
    }
  }

  async loadSession(sessionId?: string): Promise<SessionState | null> {
    try {
      if (sessionId) {
        const sessionFile = path.join(this.sessionDir, `session-${sessionId}.json`);
        const data = await fs.readFile(sessionFile, 'utf-8');
        this.currentSession = JSON.parse(data);
      } else {
        const data = await fs.readFile(this.sessionFile, 'utf-8');
        this.currentSession = JSON.parse(data);
      }
      return this.currentSession;
    } catch {
      return null;
    }
  }

  async resetSession(): Promise<void> {
    await this.endSession();
    await this.startSession();
  }

  // Context Window Management
  async buildContextWindow(
    maxTokens: number = 4000,
    priority: ContextWindow['priority'] = 'relevant',
  ): Promise<ContextWindow> {
    const session = this.currentSession;
    if (!session) {
      throw new Error('No active session for context building');
    }

    const contextWindow: ContextWindow = {
      maxTokens,
      currentTokens: 0,
      entries: [],
      priority,
      overflow: [],
    };

    // Get relevant memories
    const memories = await this.getRelevantMemories(session, 50);

    // Sort by priority strategy
    const sortedMemories = this.sortMemoriesByPriority(memories, priority);

    // Fill context window
    for (const memory of sortedMemories) {
      const tokens = this.estimateTokens(memory.content);

      if (contextWindow.currentTokens + tokens <= maxTokens) {
        contextWindow.entries.push(memory);
        contextWindow.currentTokens += tokens;
      } else {
        contextWindow.overflow.push(memory);
      }
    }

    return contextWindow;
  }

  async addToContext(content: string, tags: string[] = []): Promise<void> {
    if (!this.currentSession) {
      throw new Error('No active session for context management');
    }

    // Save as contextual memory
    const memoryId = await this.saveMemory(content, {
      type: 'context',
      tags: ['session-context', ...tags],
      source: 'context-manager',
    });

    // Add to session context
    this.currentSession.currentContext.push(content);
    this.currentSession.memoryRefs.push(memoryId);

    // Limit context size
    if (this.currentSession.currentContext.length > 20) {
      this.currentSession.currentContext = this.currentSession.currentContext.slice(-20);
    }

    await this.saveSession();
  }

  // Helper Methods
  private async loadMemoryData(): Promise<{
    entries: MemoryEntry[];
    version: string;
  }> {
    try {
      const data = await fs.readFile(this.memoryFile, 'utf-8');
      return JSON.parse(data);
    } catch {
      return { entries: [], version: '1.0.0' };
    }
  }

  private async saveSession(): Promise<void> {
    if (!this.currentSession) return;

    await fs.mkdir(this.sessionDir, { recursive: true });
    await fs.writeFile(this.sessionFile, JSON.stringify(this.currentSession, null, 2));
  }

  private generateId(content: string): string {
    return createHash('sha256').update(content).digest('hex').substring(0, 16);
  }

  private generateSessionId(): string {
    return `session-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  }

  private calculateRelevanceScore(entry: MemoryEntry, query: string): number {
    const queryLower = query.toLowerCase();
    const contentLower = entry.content.toLowerCase();

    let score = 0;

    // Exact phrase match
    if (contentLower.includes(queryLower)) score += 10;

    // Word matches
    const queryWords = queryLower.split(/\s+/);
    const contentWords = contentLower.split(/\s+/);
    const matches = queryWords.filter((word) => contentWords.includes(word));
    score += matches.length * 2;

    // Tag relevance
    const queryTags = queryLower.split(/\s+/);
    const tagMatches = entry.tags.filter((tag) =>
      queryTags.some((qt) => tag.toLowerCase().includes(qt)),
    );
    score += tagMatches.length * 3;

    // Confidence and recency
    score += entry.confidence * 5;
    const daysSinceCreation =
      (Date.now() - new Date(entry.timestamp).getTime()) / (1000 * 60 * 60 * 24);
    score += Math.max(0, 5 - daysSinceCreation); // Recent entries get bonus

    return score;
  }

  private async cleanupExpiredMemories(memoryData: { entries: MemoryEntry[] }): Promise<void> {
    const now = new Date();
    memoryData.entries = memoryData.entries.filter(
      (entry) => !entry.expires || new Date(entry.expires) > now,
    );
  }

  private async analyzeProject(workingDirectory: string): Promise<SessionState['projectInfo']> {
    try {
      // Check for package.json
      const packageJsonPath = path.join(workingDirectory, 'package.json');
      try {
        const packageData = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
        return {
          name: packageData.name || path.basename(workingDirectory),
          type: 'nodejs',
          packageManager: 'pnpm', // Could be detected
          frameworks: this.detectFrameworks(packageData),
        };
      } catch {
        // Not a Node.js project
      }

      // Check for Python project
      const pyprojectPath = path.join(workingDirectory, 'pyproject.toml');
      try {
        await fs.access(pyprojectPath);
        return {
          name: path.basename(workingDirectory),
          type: 'python',
          frameworks: ['python'],
        };
      } catch {
        // Not a Python project
      }

      return {
        name: path.basename(workingDirectory),
        type: 'unknown',
        frameworks: [],
      };
    } catch {
      return undefined;
    }
  }

  private detectFrameworks(packageData: any): string[] {
    const frameworks: string[] = [];
    const deps = {
      ...packageData.dependencies,
      ...packageData.devDependencies,
    };

    if (deps.react) frameworks.push('React');
    if (deps.next) frameworks.push('Next.js');
    if (deps.vue) frameworks.push('Vue');
    if (deps.angular) frameworks.push('Angular');
    if (deps.express) frameworks.push('Express');
    if (deps.fastify) frameworks.push('Fastify');

    return frameworks;
  }

  private async getRelevantMemories(session: SessionState, limit: number): Promise<MemoryEntry[]> {
    const memoryData = await this.loadMemoryData();

    // Get memories related to current project
    const projectMemories = memoryData.entries.filter(
      (entry) =>
        entry.tags.includes('project') ||
        entry.tags.includes(session.projectInfo?.name || '') ||
        entry.type === 'context',
    );

    // Get recent memories
    const cutoff = new Date();
    cutoff.setHours(cutoff.getHours() - 24); // Last 24 hours
    const recentMemories = memoryData.entries.filter((entry) => new Date(entry.timestamp) > cutoff);

    // Combine and deduplicate
    const relevantMemories = [...new Set([...projectMemories, ...recentMemories])];

    return relevantMemories.slice(0, limit);
  }

  private sortMemoriesByPriority(
    memories: MemoryEntry[],
    priority: ContextWindow['priority'],
  ): MemoryEntry[] {
    switch (priority) {
      case 'recent':
        return memories.sort(
          (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
        );

      case 'important':
        return memories.sort((a, b) => b.confidence * 10 - a.confidence * 10);

      case 'relevant':
      default:
        return memories.sort((a, b) => {
          const aScore = a.confidence + (a.type === 'context' ? 2 : 0);
          const bScore = b.confidence + (b.type === 'context' ? 2 : 0);
          return bScore - aScore;
        });
    }
  }

  private estimateTokens(text: string): number {
    // Rough estimation: ~4 characters per token
    return Math.ceil(text.length / 4);
  }

  // Public getters
  getCurrentSession(): SessionState | null {
    return this.currentSession;
  }

  getMemoryStats(): Promise<{
    total: number;
    byType: Record<string, number>;
    totalSize: string;
  }> {
    return this.loadMemoryData().then((data) => {
      const byType: Record<string, number> = {};
      let totalSize = 0;

      data.entries.forEach((entry) => {
        byType[entry.type] = (byType[entry.type] || 0) + 1;
        totalSize += entry.content.length;
      });

      return {
        total: data.entries.length,
        byType,
        totalSize: `${(totalSize / 1024).toFixed(1)} KB`,
      };
    });
  }
}

export async function memoryManagerCommand(args: string[] = []): Promise<void> {
  const [action, ...params] = args;

  if (!action) {
    console.log(chalk.blue('🧠 Memory & Context Management'));
    console.log('');
    console.log(chalk.yellow('Memory Operations:'));
    console.log('  save <content>               Save a fact to memory');
    console.log('  search <query>               Search memory');
    console.log('  list [--type=fact]           List stored memories');
    console.log('  delete <id>                  Delete memory by ID');
    console.log('  stats                        Show memory statistics');
    console.log('');
    console.log(chalk.yellow('Session Management:'));
    console.log('  session-start                Start new session');
    console.log('  session-status               Show current session');
    console.log('  session-end                  End current session');
    console.log('  session-reset                Reset/restart session');
    console.log('');
    console.log(chalk.yellow('Context Management:'));
    console.log('  context-add <content>        Add to session context');
    console.log('  context-build [tokens]       Build context window');
    console.log('  context-clear                Clear session context');
    console.log('');
    console.log(chalk.yellow('Examples:'));
    console.log('  cortex memory save "User prefers TypeScript over JavaScript" --tags=preference');
    console.log('  cortex memory search "typescript" --type=preference');
    console.log('  cortex memory session-start');
    console.log('  cortex memory context-add "Working on authentication feature"');
    console.log('');
    return;
  }

  try {
    const memory = new MemoryManager();

    switch (action) {
      case 'save': {
        const content = params.join(' ');
        if (!content) {
          console.error(chalk.red('❌ Content required'));
          process.exit(1);
        }

        // Parse options from args
        const tagsParam = args.find((arg) => arg.startsWith('--tags='));
        const typeParam = args.find((arg) => arg.startsWith('--type='));
        const confidenceParam = args.find((arg) => arg.startsWith('--confidence='));

        const options = {
          tags: tagsParam ? tagsParam.split('=')[1].split(',') : [],
          type: typeParam ? (typeParam.split('=')[1] as MemoryEntry['type']) : ('fact' as const),
          confidence: confidenceParam ? parseFloat(confidenceParam.split('=')[1]) : 0.8,
        };

        const id = await memory.saveMemory(content, options);
        console.log(chalk.green(`✅ Memory saved with ID: ${id}`));
        break;
      }

      case 'search': {
        const query = params.join(' ');
        if (!query) {
          console.error(chalk.red('❌ Search query required'));
          process.exit(1);
        }

        const results = await memory.searchMemory(query, { limit: 10 });

        console.log(chalk.bold.blue(`🔍 Search Results (${results.length})`));
        console.log('═'.repeat(60));

        if (results.length === 0) {
          console.log(chalk.gray('No memories found.'));
        } else {
          results.forEach((entry) => {
            console.log(`${chalk.cyan(entry.id)} [${chalk.yellow(entry.type)}]`);
            console.log(`  ${entry.content}`);
            console.log(
              `  ${chalk.gray(`Tags: ${entry.tags.join(', ')} | Confidence: ${entry.confidence} | ${entry.timestamp}`)}`,
            );
            console.log('');
          });
        }
        break;
      }

      case 'list': {
        const typeParam = args.find((arg) => arg.startsWith('--type='));
        const type = typeParam ? (typeParam.split('=')[1] as MemoryEntry['type']) : undefined;

        const memories = await memory.listMemories({ type, limit: 20 });

        console.log(chalk.bold.blue(`📋 Memory List (${memories.length})`));
        console.log('═'.repeat(60));

        memories.forEach((entry) => {
          const typeIcon =
            {
              fact: '📊',
              preference: '⚙️',
              context: '🔗',
              decision: '⚖️',
            }[entry.type] || '📄';

          console.log(`${typeIcon} ${chalk.cyan(entry.id)} [${chalk.yellow(entry.type)}]`);
          console.log(
            `  ${entry.content.substring(0, 100)}${entry.content.length > 100 ? '...' : ''}`,
          );
          console.log(
            `  ${chalk.gray(`${entry.timestamp.split('T')[0]} | Confidence: ${entry.confidence}`)}`,
          );
          console.log('');
        });
        break;
      }

      case 'delete': {
        const [id] = params;
        if (!id) {
          console.error(chalk.red('❌ Memory ID required'));
          process.exit(1);
        }

        const deleted = await memory.deleteMemory(id);
        if (deleted) {
          console.log(chalk.green(`✅ Memory ${id} deleted`));
        } else {
          console.log(chalk.yellow(`⚠️ Memory ${id} not found`));
        }
        break;
      }

      case 'stats': {
        const stats = await memory.getMemoryStats();

        console.log(chalk.bold.blue('📊 Memory Statistics'));
        console.log('═'.repeat(40));
        console.log(`Total Memories: ${chalk.green(stats.total)}`);
        console.log(`Total Size: ${chalk.green(stats.totalSize)}`);
        console.log('');
        console.log(chalk.yellow('By Type:'));
        Object.entries(stats.byType).forEach(([type, count]) => {
          console.log(`  ${type}: ${chalk.cyan(count)}`);
        });
        break;
      }

      case 'session-start': {
        const sessionId = await memory.startSession();
        console.log(chalk.green(`✅ Session started: ${sessionId}`));
        break;
      }

      case 'session-status': {
        const session = memory.getCurrentSession() || (await memory.loadSession());
        if (session) {
          console.log(chalk.bold.blue('📱 Current Session'));
          console.log('═'.repeat(40));
          console.log(`ID: ${chalk.cyan(session.id)}`);
          console.log(`Started: ${chalk.gray(session.startTime.split('T')[0])}`);
          console.log(`Directory: ${chalk.yellow(session.workingDirectory)}`);
          console.log(`Context Items: ${chalk.green(session.currentContext.length)}`);
          console.log(`Memory Refs: ${chalk.green(session.memoryRefs.length)}`);

          if (session.projectInfo) {
            console.log(
              `Project: ${chalk.cyan(session.projectInfo.name)} (${session.projectInfo.type})`,
            );
          }
        } else {
          console.log(chalk.yellow('⚠️ No active session'));
        }
        break;
      }

      case 'session-end': {
        await memory.endSession();
        console.log(chalk.green('✅ Session ended'));
        break;
      }

      case 'session-reset': {
        await memory.resetSession();
        console.log(chalk.green('✅ Session reset'));
        break;
      }

      case 'context-add': {
        const content = params.join(' ');
        if (!content) {
          console.error(chalk.red('❌ Content required'));
          process.exit(1);
        }

        await memory.addToContext(content);
        console.log(chalk.green('✅ Added to session context'));
        break;
      }

      case 'context-build': {
        const tokens = params[0] ? parseInt(params[0]) : 4000;
        const contextWindow = await memory.buildContextWindow(tokens);

        console.log(chalk.bold.blue('🪟 Context Window'));
        console.log('═'.repeat(50));
        console.log(`Max Tokens: ${chalk.yellow(contextWindow.maxTokens)}`);
        console.log(`Current Tokens: ${chalk.green(contextWindow.currentTokens)}`);
        console.log(`Entries: ${chalk.cyan(contextWindow.entries.length)}`);
        console.log(`Overflow: ${chalk.red(contextWindow.overflow.length)}`);
        console.log('');

        contextWindow.entries.forEach((entry, i) => {
          console.log(
            `${i + 1}. [${chalk.yellow(entry.type)}] ${entry.content.substring(0, 80)}...`,
          );
        });
        break;
      }

      case 'context-clear': {
        const session = memory.getCurrentSession();
        if (session) {
          await memory.updateSession({ currentContext: [], memoryRefs: [] });
          console.log(chalk.green('✅ Session context cleared'));
        } else {
          console.log(chalk.yellow('⚠️ No active session'));
        }
        break;
      }

      default:
        console.error(chalk.red(`❌ Unknown action: ${action}`));
        process.exit(1);
    }
  } catch (error) {
    console.error(
      chalk.red(
        `❌ Memory management failed: ${error instanceof Error ? error.message : String(error)}`,
      ),
    );
    process.exit(1);
  }
}

// Direct execution support
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  memoryManagerCommand(args).catch((error) => {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(chalk.red(`Memory management failed: ${errorMessage}`));
    process.exit(1);
  });
}

export default MemoryManager;
