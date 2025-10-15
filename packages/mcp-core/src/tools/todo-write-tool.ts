import { readFile, stat, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { z } from 'zod';
import { createTimestampedId } from '../utils/secure-random.js';
import type { McpTool, ToolExecutionContext } from '../tools.js';
import { ToolExecutionError } from '../tools.js';

const TodoWriteInputSchema = z.object({
	path: z.string().min(1, 'path is required'),
	operation: z.enum(['create', 'add', 'update', 'complete', 'delete', 'list']),
	title: z.string().optional(),
	description: z.string().optional(),
	priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
	dueDate: z.string().optional(), // ISO date string
	tags: z.array(z.string()).optional(),
	itemId: z.string().optional(), // required for update, complete, delete operations
	format: z.enum(['json', 'markdown', 'text']).optional(),
});

export type TodoWriteInput = z.infer<typeof TodoWriteInputSchema>;

export interface TodoItem {
	id: string;
	title: string;
	description?: string;
	priority: 'low' | 'medium' | 'high' | 'urgent';
	status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
	dueDate?: string;
	createdAt: string;
	updatedAt: string;
	completedAt?: string;
	tags: string[];
}

export interface TodoList {
	title: string;
	description?: string;
	items: TodoItem[];
	createdAt: string;
	updatedAt: string;
	format: 'json' | 'markdown' | 'text';
}

export interface TodoWriteResult {
	path: string;
	operation: string;
	success: boolean;
	message: string;
	todoList?: TodoList;
	affectedItem?: TodoItem;
	totalItems: number;
	pendingItems: number;
	completedItems: number;
	timestamp: string;
}

export class TodoWriteTool implements McpTool<TodoWriteInput, TodoWriteResult> {
	readonly name = 'todo-write';
	readonly description =
		'Creates and manages structured task lists with support for different formats.';
	readonly inputSchema = TodoWriteInputSchema;

	async execute(input: TodoWriteInput, context?: ToolExecutionContext): Promise<TodoWriteResult> {
		if (context?.signal?.aborted) {
			throw new ToolExecutionError('TodoWrite tool execution aborted.', {
				code: 'E_TOOL_ABORTED',
			});
		}

		try {
			const filePath = resolve(input.path);

			// Security check - prevent accessing outside workspace
			const cwd = process.cwd();
			if (!filePath.startsWith(cwd)) {
				throw new ToolExecutionError(`Access denied: ${input.path} is outside workspace`, {
					code: 'E_ACCESS_DENIED',
				});
			}

			// Load or create todo list
			let todoList: TodoList;
			let exists = false;

			try {
				const stats = await stat(filePath);
				exists = stats.isFile();
			} catch {
				exists = false;
			}

			if (exists) {
				todoList = await this.loadTodoList(filePath);
			} else if (input.operation === 'create') {
				todoList = this.createEmptyTodoList(input.format || 'json');
			} else {
				throw new ToolExecutionError(`Todo list does not exist: ${input.path}`, {
					code: 'E_FILE_NOT_FOUND',
				});
			}

			// Execute operation
			const result = await this.executeOperation(todoList, input);

			// Save updated todo list
			if (result.success && input.operation !== 'list') {
				await this.saveTodoList(filePath, todoList);
			}

			const stats = this.calculateStats(todoList);

			return {
				path: input.path,
				operation: input.operation,
				success: result.success,
				message: result.message,
				todoList: input.operation === 'list' ? todoList : undefined,
				affectedItem: result.affectedItem,
				totalItems: stats.total,
				pendingItems: stats.pending,
				completedItems: stats.completed,
				timestamp: new Date().toISOString(),
			};
		} catch (error) {
			if (error instanceof ToolExecutionError) {
				throw error;
			}

			const errorMessage = error instanceof Error ? error.message : String(error);

			if (errorMessage.includes('ENOENT')) {
				throw new ToolExecutionError(`File not found: ${input.path}`, {
					code: 'E_FILE_NOT_FOUND',
					cause: error,
				});
			}

			if (errorMessage.includes('EACCES')) {
				throw new ToolExecutionError(`Permission denied: ${input.path}`, {
					code: 'E_PERMISSION_DENIED',
					cause: error,
				});
			}

			throw new ToolExecutionError(`TodoWrite failed: ${errorMessage}`, {
				code: 'E_TODO_FAILED',
				cause: error,
			});
		}
	}

	private async loadTodoList(filePath: string): Promise<TodoList> {
		const content = await readFile(filePath, 'utf8');

		// Try to determine format from extension or content
		if (filePath.endsWith('.json')) {
			return JSON.parse(content);
		} else if (filePath.endsWith('.md')) {
			return this.parseMarkdownTodoList(content);
		} else {
			// Try JSON first, fallback to text
			try {
				return JSON.parse(content);
			} catch {
				return this.parseTextTodoList(content);
			}
		}
	}

	private createEmptyTodoList(format: 'json' | 'markdown' | 'text'): TodoList {
		const now = new Date().toISOString();
		return {
			title: 'Todo List',
			description: 'Task list created by TodoWrite tool',
			items: [],
			createdAt: now,
			updatedAt: now,
			format,
		};
	}

	private async executeOperation(
		todoList: TodoList,
		input: TodoWriteInput,
	): Promise<{
		success: boolean;
		message: string;
		affectedItem?: TodoItem;
	}> {
		const now = new Date().toISOString();
		todoList.updatedAt = now;

		switch (input.operation) {
			case 'create':
				return { success: true, message: 'Todo list created successfully' };

			case 'add': {
				if (!input.title) {
					throw new ToolExecutionError('Title is required for add operation', {
						code: 'E_MISSING_TITLE',
					});
				}

				const newItem: TodoItem = {
					id: this.generateId(),
					title: input.title,
					description: input.description,
					priority: input.priority || 'medium',
					status: 'pending',
					dueDate: input.dueDate,
					createdAt: now,
					updatedAt: now,
					tags: input.tags || [],
				};

				todoList.items.push(newItem);
				return {
					success: true,
					message: `Added todo item: ${input.title}`,
					affectedItem: newItem,
				};
			}

			case 'update': {
				if (!input.itemId) {
					throw new ToolExecutionError('Item ID is required for update operation', {
						code: 'E_MISSING_ITEM_ID',
					});
				}

				const itemToUpdate = todoList.items.find((item) => item.id === input.itemId);
				if (!itemToUpdate) {
					return { success: false, message: `Todo item not found: ${input.itemId}` };
				}

				if (input.title) itemToUpdate.title = input.title;
				if (input.description !== undefined) itemToUpdate.description = input.description;
				if (input.priority) itemToUpdate.priority = input.priority;
				if (input.dueDate !== undefined) itemToUpdate.dueDate = input.dueDate;
				if (input.tags) itemToUpdate.tags = input.tags;
				itemToUpdate.updatedAt = now;

				return {
					success: true,
					message: `Updated todo item: ${itemToUpdate.title}`,
					affectedItem: itemToUpdate,
				};
			}

			case 'complete': {
				if (!input.itemId) {
					throw new ToolExecutionError('Item ID is required for complete operation', {
						code: 'E_MISSING_ITEM_ID',
					});
				}

				const itemToComplete = todoList.items.find((item) => item.id === input.itemId);
				if (!itemToComplete) {
					return { success: false, message: `Todo item not found: ${input.itemId}` };
				}

				itemToComplete.status = 'completed';
				itemToComplete.completedAt = now;
				itemToComplete.updatedAt = now;

				return {
					success: true,
					message: `Completed todo item: ${itemToComplete.title}`,
					affectedItem: itemToComplete,
				};
			}

			case 'delete': {
				if (!input.itemId) {
					throw new ToolExecutionError('Item ID is required for delete operation', {
						code: 'E_MISSING_ITEM_ID',
					});
				}

				const itemIndex = todoList.items.findIndex((item) => item.id === input.itemId);
				if (itemIndex === -1) {
					return { success: false, message: `Todo item not found: ${input.itemId}` };
				}

				const deletedItem = todoList.items.splice(itemIndex, 1)[0];
				return {
					success: true,
					message: `Deleted todo item: ${deletedItem.title}`,
					affectedItem: deletedItem,
				};
			}

			case 'list':
				return { success: true, message: `Listed ${todoList.items.length} todo items` };

			default:
				throw new ToolExecutionError(`Unknown operation: ${input.operation}`, {
					code: 'E_UNKNOWN_OPERATION',
				});
		}
	}

	private async saveTodoList(filePath: string, todoList: TodoList): Promise<void> {
		let content: string;

		switch (todoList.format) {
			case 'json':
				content = JSON.stringify(todoList, null, 2);
				break;
			case 'markdown':
				content = this.formatAsMarkdown(todoList);
				break;
			case 'text':
				content = this.formatAsText(todoList);
				break;
			default:
				content = JSON.stringify(todoList, null, 2);
		}

		await writeFile(filePath, content, 'utf8');
	}

	private parseMarkdownTodoList(content: string): TodoList {
		// Basic markdown parser for todo lists
		const lines = content.split('\n');
		const todoList: TodoList = this.createEmptyTodoList('markdown');

		for (const line of lines) {
			const trimmed = line.trim();
			if (trimmed.startsWith('- [ ]') || trimmed.startsWith('- [x]')) {
				const completed = trimmed.startsWith('- [x]');
				const title = trimmed.substring(5).trim();

				todoList.items.push({
					id: this.generateId(),
					title,
					priority: 'medium',
					status: completed ? 'completed' : 'pending',
					createdAt: new Date().toISOString(),
					updatedAt: new Date().toISOString(),
					completedAt: completed ? new Date().toISOString() : undefined,
					tags: [],
				});
			}
		}

		return todoList;
	}

	private parseTextTodoList(content: string): TodoList {
		// Basic text parser for todo lists
		const lines = content.split('\n').filter((line) => line.trim());
		const todoList: TodoList = this.createEmptyTodoList('text');

		for (const line of lines) {
			const trimmed = line.trim();
			if (trimmed && !trimmed.startsWith('#')) {
				todoList.items.push({
					id: this.generateId(),
					title: trimmed,
					priority: 'medium',
					status: 'pending',
					createdAt: new Date().toISOString(),
					updatedAt: new Date().toISOString(),
					tags: [],
				});
			}
		}

		return todoList;
	}

	private formatAsMarkdown(todoList: TodoList): string {
		let content = `# ${todoList.title}\n\n`;
		if (todoList.description) {
			content += `${todoList.description}\n\n`;
		}

		for (const item of todoList.items) {
			const checkbox = item.status === 'completed' ? '[x]' : '[ ]';
			content += `- ${checkbox} ${item.title}`;

			if (item.priority !== 'medium') {
				content += ` (${item.priority})`;
			}

			if (item.tags.length > 0) {
				content += ` ${item.tags.map((tag) => `#${tag}`).join(' ')}`;
			}

			content += '\n';
		}

		return content;
	}

	private formatAsText(todoList: TodoList): string {
		let content = `${todoList.title}\n${'='.repeat(todoList.title.length)}\n\n`;

		if (todoList.description) {
			content += `${todoList.description}\n\n`;
		}

		for (const item of todoList.items) {
			const status = item.status === 'completed' ? '[DONE]' : '[TODO]';
			content += `${status} ${item.title}`;

			if (item.priority !== 'medium') {
				content += ` (${item.priority.toUpperCase()})`;
			}

			content += '\n';
		}

		return content;
	}

	private calculateStats(todoList: TodoList): {
		total: number;
		pending: number;
		completed: number;
	} {
		const total = todoList.items.length;
		const completed = todoList.items.filter((item) => item.status === 'completed').length;
		const pending = total - completed;

		return { total, pending, completed };
	}

	private generateId(): string {
            return createTimestampedId('todo');
        }
}

export const todoWriteTool = new TodoWriteTool();
