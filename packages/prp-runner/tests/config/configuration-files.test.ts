import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { loadConfig } from '../../src/config';

function tmpFile(ext: string, content: string): string {
    const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'prp-config-')), `cfg.${ext}`);
    fs.writeFileSync(file, content, 'utf8');
    return file;
}

describe('Configuration file loading', () => {
    beforeEach(() => {
        vi.resetModules();
        delete process.env.PRP_PORT;
        delete process.env.PRP_AI_PROVIDER;
    });

    it('loads JSON file and merges with defaults', () => {
        const file = tmpFile(
            'json',
            JSON.stringify({ server: { port: 4000 }, ai: { provider: 'mlx' } }),
        );
        const cfg = loadConfig(file, { server: { port: 3001 }, ai: { model: 'gpt-4' } });
        expect(cfg.server.port).toBe(4000); // from file
        expect(cfg.ai.provider).toBe('mlx'); // from file
        expect(cfg.ai.model).toBe('gpt-4'); // from defaults
    });

    it('loads YAML file and respects precedence env > file > defaults', () => {
        const yaml = `
server:
  port: 4100
ai:
  provider: mlx
`;
        const file = tmpFile('yaml', yaml);
        process.env.PRP_PORT = '4200';
        const cfg = loadConfig(file, { server: { port: 3002 }, ai: { model: 'gpt-4' } });
        expect(cfg.server.port).toBe(4200); // env wins
        expect(cfg.ai.provider).toBe('mlx'); // file
        expect(cfg.ai.model).toBe('gpt-4'); // defaults
    });
});
