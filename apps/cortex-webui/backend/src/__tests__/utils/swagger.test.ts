// Swagger configuration tests
import { beforeEach, describe, expect, it } from 'vitest';
import { swaggerSpec } from '../../utils/swagger';

describe('Swagger Configuration', () => {
	it('should export swagger specification', () => {
		expect(swaggerSpec).toBeDefined();
		expect(typeof swaggerSpec).toBe('object');
	});

	it('should have required OpenAPI fields', () => {
		expect(swaggerSpec.openapi).toBe('3.0.0');
		expect(swaggerSpec.info).toBeDefined();
		expect(swaggerSpec.info.title).toBe('Cortex WebUI API');
		expect(swaggerSpec.info.version).toBe('1.0.0');
	});

	it('should have brAInwav branding', () => {
		expect(swaggerSpec.info.contact.name).toBe('brAInwav');
		expect(swaggerSpec.info.contact.email).toBe('support@cortex-os.com');
	});

	it('should have servers defined', () => {
		expect(swaggerSpec.servers).toBeDefined();
		expect(Array.isArray(swaggerSpec.servers)).toBe(true);
		expect(swaggerSpec.servers).toHaveLength(2);
		expect(swaggerSpec.servers[0].url).toBe('http://localhost:3001');
		expect(swaggerSpec.servers[1].url).toBe('https://api.cortex-webui.com');
	});

	it('should have security schemes defined', () => {
		expect(swaggerSpec.components.securitySchemes).toBeDefined();
		expect(swaggerSpec.components.securitySchemes.BearerAuth).toBeDefined();
		expect(swaggerSpec.components.securitySchemes.ApiKeyAuth).toBeDefined();
		expect(swaggerSpec.components.securitySchemes.BearerAuth.type).toBe('http');
		expect(swaggerSpec.components.securitySchemes.ApiKeyAuth.type).toBe('apiKey');
	});

	it('should have API tags defined', () => {
		expect(swaggerSpec.tags).toBeDefined();
		expect(Array.isArray(swaggerSpec.tags)).toBe(true);

		const tagNames = swaggerSpec.tags.map((tag) => tag.name);
		expect(tagNames).toContain('Health');
		expect(tagNames).toContain('Authentication');
		expect(tagNames).toContain('Conversations');
		expect(tagNames).toContain('Messages');
		expect(tagNames).toContain('Models');
		expect(tagNames).toContain('Files');
	});

	it('should have error response schemas', () => {
		expect(swaggerSpec.components.responses.UnauthorizedError).toBeDefined();
		expect(swaggerSpec.components.responses.ForbiddenError).toBeDefined();
		expect(swaggerSpec.components.responses.NotFoundError).toBeDefined();
		expect(swaggerSpec.components.responses.ValidationError).toBeDefined();
		expect(swaggerSpec.components.responses.RateLimitError).toBeDefined();
	});

	it('should have model schemas defined', () => {
		expect(swaggerSpec.components.schemas.User).toBeDefined();
		expect(swaggerSpec.components.schemas.Conversation).toBeDefined();
		expect(swaggerSpec.components.schemas.Message).toBeDefined();
		expect(swaggerSpec.components.schemas.Error).toBeDefined();
		expect(swaggerSpec.components.schemas.HealthCheck).toBeDefined();
	});

	it('should have required User schema fields', () => {
		const userSchema = swaggerSpec.components.schemas.User;
		expect(userSchema.required).toContain('id');
		expect(userSchema.required).toContain('email');
		expect(userSchema.required).toContain('role');
		expect(userSchema.properties.email.format).toBe('email');
		expect(userSchema.properties.role.enum).toEqual(['admin', 'user', 'guest']);
	});

	it('should have required Message schema fields', () => {
		const messageSchema = swaggerSpec.components.schemas.Message;
		expect(messageSchema.required).toContain('id');
		expect(messageSchema.required).toContain('conversationId');
		expect(messageSchema.required).toContain('role');
		expect(messageSchema.required).toContain('content');
		expect(messageSchema.properties.role.enum).toEqual(['user', 'assistant', 'system']);
	});

	it('should have health check schema with uptime', () => {
		const healthSchema = swaggerSpec.components.schemas.HealthCheck;
		expect(healthSchema.properties.status.enum).toEqual(['healthy', 'degraded', 'unhealthy']);
		expect(healthSchema.properties.uptime.type).toBe('number');
		expect(healthSchema.properties.uptime.description).toBe('Server uptime in seconds');
	});

	it('should include license information', () => {
		expect(swaggerSpec.info.license).toBeDefined();
		expect(swaggerSpec.info.license.name).toBe('Apache 2.0');
		expect(swaggerSpec.info.license.url).toBe('https://www.apache.org/licenses/LICENSE-2.0.html');
	});
});
