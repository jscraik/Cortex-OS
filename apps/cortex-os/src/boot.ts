import { SpanStatusCode } from '@opentelemetry/api';
import { Container } from 'inversify';
import {
	provideArtifactRepository,
	provideEvidenceRepository,
	provideMCP,
	provideMemories,
	provideOrchestration,
	provideProfileRepository,
	provideTaskRepository,
	tracer,
} from './services.js';
import { TOKENS } from './tokens.js';

export function createContainer(): Container {
	const container = new Container({
		defaultScope: 'Singleton',
		autoBindInjectable: false,
	});

	container.bind(TOKENS.Memories).toConstantValue(provideMemories());
	container.bind(TOKENS.Orchestration).toConstantValue(provideOrchestration());
	container.bind(TOKENS.MCPGateway).toConstantValue(provideMCP());
	container.bind(TOKENS.TaskRepository).toConstantValue(provideTaskRepository());
	container.bind(TOKENS.ProfileRepository).toConstantValue(provideProfileRepository());
	container.bind(TOKENS.ArtifactRepository).toConstantValue(provideArtifactRepository());
	container.bind(TOKENS.EvidenceRepository).toConstantValue(provideEvidenceRepository());

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
			TOKENS.TaskRepository,
			TOKENS.ProfileRepository,
			TOKENS.ArtifactRepository,
			TOKENS.EvidenceRepository,
		];
		for (const token of requiredTokens) {
			if (!container.isBound(token)) throw new Error(`Missing binding for ${token.toString()}`);
			const service = container.get(token as unknown as symbol);
			if (!service) throw new Error(`Failed to resolve binding for ${token.toString()}`);
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
