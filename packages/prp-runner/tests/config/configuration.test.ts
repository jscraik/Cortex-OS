import { beforeEach, describe, expect, it, vi } from 'vitest';
import { loadConfig, validateConfig } from '../../src/config';

describe('Configuration Management', () => {
	beforeEach(() => {
		vi.resetModules();
		delete process.env.PRP_PORT;
		delete process.env.PRP_AI_PROVIDER;
		delete process.env.PRP_AI_MODEL;
		delete process.env.PRP_MAX_TOKENS;
		delete process.env.PRP_BCRYPT_ROUNDS;
		delete process.env.PRP_AI_BREAKERS_OLLAMA_THRESHOLD;
		delete process.env.PRP_AI_BREAKERS_OLLAMA_TIMEOUT;
		delete process.env.PRP_AI_BREAKERS_MLX_THRESHOLD;
		delete process.env.PRP_AI_BREAKERS_MLX_TIMEOUT;
	});

	it('should validate configuration schema', () => {
		const bad: unknown = {
			server: { port: 'invalid' }, // wrong type
			ai: { maxTokens: -1 }, // invalid value
		};
		expect(() => validateConfig(bad)).toThrow();
	});

	it('should load environment variables', () => {
		process.env.PRP_PORT = '8080';
		process.env.PRP_AI_PROVIDER = 'openai';
		process.env.PRP_AI_MODEL = 'gpt-4o-mini';
		process.env.PRP_MAX_TOKENS = '1234';
		process.env.PRP_BCRYPT_ROUNDS = '12';
		const cfg = loadConfig();
		expect(cfg.server.port).toBe(8080);
		expect(cfg.ai.provider).toBe('openai');
		expect(cfg.ai.model).toBe('gpt-4o-mini');
		expect(cfg.ai.maxTokens).toBe(1234);
		expect(cfg.security.bcryptRounds).toBe(12);
	});

	it('should merge config sources with env priority', () => {
		process.env.PRP_PORT = '9000';
		const cfg = loadConfig(undefined, {
			server: { port: 3000 },
			ai: { model: 'gpt-4' },
			security: { bcryptRounds: 10 },
		});
		expect(cfg.server.port).toBe(9000); // env overrides
		expect(cfg.ai.model).toBe('gpt-4'); // from defaults argument
		expect(cfg.security.bcryptRounds).toBe(10);
	});

	it('should load breaker env flags for ollama and mlx', () => {
		process.env.PRP_AI_BREAKERS_OLLAMA_THRESHOLD = '5';
		process.env.PRP_AI_BREAKERS_OLLAMA_TIMEOUT = '250';
		process.env.PRP_AI_BREAKERS_MLX_THRESHOLD = '4';
		process.env.PRP_AI_BREAKERS_MLX_TIMEOUT = '300';
		const cfg = loadConfig();
		expect(cfg.ai.breakers?.ollama?.threshold).toBe(5);
		expect(cfg.ai.breakers?.ollama?.timeout).toBe(250);
		expect(cfg.ai.breakers?.mlx?.threshold).toBe(4);
		expect(cfg.ai.breakers?.mlx?.timeout).toBe(300);
	});
});
