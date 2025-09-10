// plated: cortex

import { intro, outro, select, text } from '@clack/prompts';
import { Command } from 'commander';
import { z } from 'zod';

export const agentCreate = new Command('create')
  .description('Interactively scaffold a new agent')
  .option('--json', 'Output JSON')
  .action(async (opts) => {
    intro('cortex agent scaffold');
    try {
      const name = await text({ message: 'Agent name' });
      const type = await select({
        message: 'Agent type',
        options: [
          { value: 'mcp', label: 'MCP' },
          { value: 'a2a', label: 'A2A' },
          { value: 'rag', label: 'RAG' },
          { value: 'simlab', label: 'SimLab' },
        ],
      });
      const toolsInput = await text({
        message: 'Comma-separated tools',
        placeholder: 'tool1,tool2',
      });
      const mode = await select({
        message: 'Mode preset',
        options: [
          { value: 'development', label: 'Development' },
          { value: 'production', label: 'Production' },
        ],
      });

      const schema = z.object({
        name: z.string().min(1),
        type: z.enum(['mcp', 'a2a', 'rag', 'simlab']),
        tools: z.array(z.string()),
        mode: z.enum(['development', 'production']),
      });

      const data = {
        name: typeof name === 'string' ? name : '',
        type: type as string,
        tools:
          typeof toolsInput === 'string' && toolsInput.trim()
            ? toolsInput.split(',').map((s) => s.trim())
            : [],
        mode: mode as string,
      };

      const parsed = schema.parse(data);
      const timestamp = new Date().toISOString();
      const yamlFrontMatter = [
        '---',
        `name: ${parsed.name}`,
        `type: ${parsed.type}`,
        `mode: ${parsed.mode}`,
        parsed.tools.length > 0
          ? `tools:\n${parsed.tools.map((tool) => `  - ${tool}`).join('\n')}`
          : 'tools: []',
        '---',
      ].join('\n');

      if (opts.json) {
        console.log(
          JSON.stringify({ timestamp, agent: parsed }, null, 2)
        );
      } else {
        console.log(`\n${yamlFrontMatter}\n`);
      }
      outro('Agent scaffold complete');
    } catch (err) {
      const timestamp = new Date().toISOString();
      const error = {
        timestamp,
        error: {
          code: 'E_AGENT_CREATE',
          message: err instanceof Error ? err.message : 'Unknown error',
        },
      };
      if (opts.json) {
        console.error(JSON.stringify(error, null, 2));
      } else {
        console.error(`Error [E_AGENT_CREATE]: ${error.error.message}`);
      }
      process.exitCode = 1;
    }
  });
