import type { AgentToolkitSearchInput, AgentToolkitSearchResult } from '@cortex-os/contracts';
import { AgentToolkitSearchInputSchema, AgentToolkitSearchResultSchema } from '@cortex-os/contracts';
import { Tool, type ToolExecutionContext } from '../domain/Tool';
import { ShellScriptAdapter } from './ShellScriptAdapter';

export class RipgrepTool extends Tool {
  readonly name = 'ripgrep_search';
  readonly description = 'Search for patterns in code using ripgrep';
  readonly operation = 'search';

  private adapter: ShellScriptAdapter;

  constructor() {
    super();
    this.adapter = new (class extends ShellScriptAdapter {
      constructor() {
        super('rg_search.sh');
      }
    })();
  }

  async execute(input: AgentToolkitSearchInput, _context?: ToolExecutionContext): Promise<AgentToolkitSearchResult> {
    const validatedInput = this.validateInput(input);
    
    await this.adapter['validateScript']();
    
    const result = await this.adapter['executeScript']([
      validatedInput.pattern,
      validatedInput.path,
    ]) as Record<string, unknown>;

    // Add timestamp and context
    const enrichedResult = {
      ...result,
      timestamp: new Date().toISOString(),
      inputs: validatedInput,
    };

    return AgentToolkitSearchResultSchema.parse(enrichedResult);
  }

  validateInput(input: unknown): AgentToolkitSearchInput {
    return AgentToolkitSearchInputSchema.parse(input);
  }

  protected getInputSchema(): Record<string, unknown> {
    return {
      type: 'object',
      properties: {
        pattern: {
          type: 'string',
          description: 'Regular expression pattern to search for',
        },
        path: {
          type: 'string',
          description: 'Path to search in (file or directory)',
          default: '.',
        },
      },
      required: ['pattern'],
    };
  }
}

export class SemgrepTool extends Tool {
  readonly name = 'semgrep_search';
  readonly description = 'Search for patterns using Semgrep rules';
  readonly operation = 'search';

  private adapter: ShellScriptAdapter;

  constructor() {
    super();
    this.adapter = new (class extends ShellScriptAdapter {
      constructor() {
        super('semgrep_search.sh');
      }
    })();
  }

  async execute(input: SearchInput, context?: ToolExecutionContext): Promise<SearchResult> {
    const validatedInput = this.validateInput(input);
    
    await this.adapter['validateScript']();
    
    const result = await this.adapter['executeScript']([
      validatedInput.pattern,
      validatedInput.path,
    ]);

    const enrichedResult = {
      ...result,
      timestamp: new Date().toISOString(),
      inputs: validatedInput,
    };

    return searchResultSchema.parse(enrichedResult);
  }

  validateInput(input: unknown): SearchInput {
    return searchInputSchema.parse(input);
  }

  protected getInputSchema(): Record<string, unknown> {
    return {
      type: 'object',
      properties: {
        pattern: {
          type: 'string',
          description: 'Semgrep rule or pattern to search for',
        },
        path: {
          type: 'string',
          description: 'Path to search in (file or directory)',
          default: '.',
        },
      },
      required: ['pattern'],
    };
  }
}

export class AstGrepTool extends Tool {
  readonly name = 'ast_grep_search';
  readonly description = 'Search for structural patterns using ast-grep';
  readonly operation = 'search';

  private adapter: ShellScriptAdapter;

  constructor() {
    super();
    this.adapter = new (class extends ShellScriptAdapter {
      constructor() {
        super('astgrep_search.sh');
      }
    })();
  }

  async execute(input: SearchInput, context?: ToolExecutionContext): Promise<SearchResult> {
    const validatedInput = this.validateInput(input);
    
    await this.adapter['validateScript']();
    
    const result = await this.adapter['executeScript']([
      validatedInput.pattern,
      validatedInput.path,
    ]);

    const enrichedResult = {
      ...result,
      timestamp: new Date().toISOString(),
      inputs: validatedInput,
    };

    return searchResultSchema.parse(enrichedResult);
  }

  validateInput(input: unknown): SearchInput {
    return searchInputSchema.parse(input);
  }

  protected getInputSchema(): Record<string, unknown> {
    return {
      type: 'object',
      properties: {
        pattern: {
          type: 'string',
          description: 'AST pattern to search for',
        },
        path: {
          type: 'string',
          description: 'Path to search in (file or directory)',
          default: '.',
        },
      },
      required: ['pattern'],
    };
  }
}