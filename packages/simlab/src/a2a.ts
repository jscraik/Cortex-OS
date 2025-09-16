import { createBus, type BusOptions } from '@cortex-os/a2a-core/bus';
import { SchemaRegistry } from '@cortex-os/a2a-core/schema-registry';
import type { Transport } from '@cortex-os/a2a-core/transport';
import { SchemaCompatibility } from '@cortex-os/a2a-contracts/schema-registry-types';
import type { TopicACL } from '@cortex-os/a2a-contracts/topic-acl';
import { inproc } from '@cortex-os/a2a-transport/inproc';
import type { ZodTypeAny } from 'zod';
import {
        AgentCreatedEventSchema,
        ExperimentResultEventSchema,
        SIMLAB_EVENT_SOURCE,
        SimulationCompletedEventSchema,
        SimulationStartedEventSchema,
} from './events/simlab-events.js';

const DEFAULT_SIMLAB_ACL: TopicACL = {
        'simlab.simulation.started': { publish: true, subscribe: true },
        'simlab.agent.created': { publish: true, subscribe: true },
        'simlab.experiment.result': { publish: true, subscribe: true },
        'simlab.simulation.completed': { publish: true, subscribe: true },
};

function registerSimlabSchema(
        registry: SchemaRegistry,
        eventType: keyof typeof DEFAULT_SIMLAB_ACL,
        version: string,
        schema: ZodTypeAny,
        description: string,
        tags: string[],
        examples: unknown[],
) {
        registry.register({
                eventType,
                version,
                schema,
                description,
                compatibility: SchemaCompatibility.BACKWARD,
                tags,
                examples,
                metadata: {
                        package: '@cortex-os/simlab',
                        source: SIMLAB_EVENT_SOURCE,
                },
        });
}

export function createSimlabSchemaRegistry(): SchemaRegistry {
        const registry = new SchemaRegistry({
                strictValidation: true,
                validateOnRegistration: true,
                enableCache: true,
        });

        registerSimlabSchema(
                registry,
                'simlab.simulation.started',
                '1.0.0',
                SimulationStartedEventSchema,
                'Emitted when a SimLab simulation run begins',
                ['simlab', 'simulation'],
                [
                        {
                                simulationId: 'sim-001',
                                name: 'Safety Drill',
                                type: 'agent',
                                parameters: { scenario: 'baseline' },
                                duration: 300,
                                startedBy: 'system',
                                startedAt: new Date('2024-01-01T00:00:00Z').toISOString(),
                        },
                ],
        );

        registerSimlabSchema(
                registry,
                'simlab.agent.created',
                '1.0.0',
                AgentCreatedEventSchema,
                'Signals that a new simulation agent has been provisioned',
                ['simlab', 'agent'],
                [
                        {
                                simulationId: 'sim-001',
                                agentId: 'agent-123',
                                type: 'llm',
                                capabilities: ['conversation'],
                                initialState: { temperature: 0.3 },
                                createdAt: new Date('2024-01-01T00:00:10Z').toISOString(),
                        },
                ],
        );

        registerSimlabSchema(
                registry,
                'simlab.experiment.result',
                '1.0.0',
                ExperimentResultEventSchema,
                'Carries experiment output captured during simulation runs',
                ['simlab', 'experiment'],
                [
                        {
                                simulationId: 'sim-001',
                                experimentId: 'exp-42',
                                agentId: 'agent-123',
                                metric: 'goal_completion',
                                value: 0.82,
                                unit: 'ratio',
                                timestamp: 1704067200,
                                recordedAt: new Date('2024-01-01T00:01:00Z').toISOString(),
                        },
                ],
        );

        registerSimlabSchema(
                registry,
                'simlab.simulation.completed',
                '1.0.0',
                SimulationCompletedEventSchema,
                'Marks the completion of a simulation with aggregated metrics',
                ['simlab', 'simulation'],
                [
                        {
                                simulationId: 'sim-001',
                                status: 'completed',
                                duration: 600,
                                totalAgents: 3,
                                totalExperiments: 5,
                                results: { score: 0.9 },
                                completedAt: new Date('2024-01-01T00:10:00Z').toISOString(),
                        },
                ],
        );

        return registry;
}

export interface SimlabBusConfig {
        transport?: Transport;
        schemaRegistry?: SchemaRegistry;
        acl?: TopicACL;
        busOptions?: BusOptions;
}

export function createSimlabBus(config: SimlabBusConfig = {}) {
        const registry = config.schemaRegistry ?? createSimlabSchemaRegistry();
        const acl: TopicACL = {
                ...DEFAULT_SIMLAB_ACL,
                ...(config.acl ?? {}),
        };
        const transport = config.transport ?? inproc();
        const bus = createBus(transport, undefined, registry, acl, config.busOptions);
        return { bus, schemaRegistry: registry, transport };
}
