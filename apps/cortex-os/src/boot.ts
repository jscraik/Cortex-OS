import { SpanStatusCode } from '@opentelemetry/api';
import { Container } from 'inversify';
import {
	provideMCP,
	provideMemories,
	provideOrchestration,
	tracer,
} from './services';
import { TOKENS } from './tokens';

export function createContainer(): Container {
	const container = new Container({
		defaultScope: 'Singleton',
		skipBaseClassChecks: true,
		autoBindInjectable: false,
	});

	container.bind(TOKENS.Memories).toConstantValue(provideMemories());
	container.bind(TOKENS.Orchestration).toConstantValue(provideOrchestration());
	container.bind(TOKENS.MCPGateway).toConstantValue(provideMCP());

	validateContainer(container);
	return container;
}

function validateContainer(container: Container): void {
	const span = tracer.startSpan('container.validation');
	try {
		const requiredTokens = [
			TOKENS.Memories,
			TOKENS.Orchestration,
			TOKENS.MCPGateway,
		];
		for (const token of requiredTokens) {
			if (!container.isBound(token))
				throw new Error(`Missing binding for ${token.toString()}`);
			const service = container.get(token as unknown as symbol);
			if (!service) throw new Error(`Failed to resolve ${token.toString()}`);
		}
		span.setStatus({ code: SpanStatusCode.OK });
	} catch (error) {
		span.recordException(error as Error);
		span.setStatus({
			code: SpanStatusCode.ERROR,
			message: error instanceof Error ? error.message : undefined,
		});
		throw error;
	} finally {
		span.end();
	}
}

export const container = createContainer();
