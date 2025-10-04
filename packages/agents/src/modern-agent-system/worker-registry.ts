import {
        type WorkerDefinition,
        type WorkerRegistry,
} from './types.js';

const createIndexes = (definitions: WorkerDefinition[]) => {
        const byName = new Map<string, WorkerDefinition>();
        const byCapability = new Map<string, WorkerDefinition>();
        for (const definition of definitions) {
                if (byName.has(definition.name)) {
                        throw new Error(
                                `brAInwav modern-agent-system: duplicate worker name "${definition.name}"`,
                        );
                }
                byName.set(definition.name, definition);
                for (const capability of definition.capabilities) {
                        if (byCapability.has(capability)) continue;
                        byCapability.set(capability, definition);
                }
        }
        return { byName, byCapability };
};

const registerWorker = (
        definition: WorkerDefinition,
        indexes: { byName: Map<string, WorkerDefinition>; byCapability: Map<string, WorkerDefinition> },
) => {
        if (indexes.byName.has(definition.name)) {
                throw new Error(
                        `brAInwav modern-agent-system: worker "${definition.name}" already registered`,
                );
        }
        indexes.byName.set(definition.name, definition);
        for (const capability of definition.capabilities) {
                if (indexes.byCapability.has(capability)) continue;
                indexes.byCapability.set(capability, definition);
        }
};

export const createWorkerRegistry = (definitions: WorkerDefinition[]): WorkerRegistry => {
        const indexes = createIndexes(definitions);
        const register = (definition: WorkerDefinition) => registerWorker(definition, indexes);
        const getWorker = (name: string) => indexes.byName.get(name);
        const findByCapability = (capability: string) => indexes.byCapability.get(capability);
        const list = () => Array.from(indexes.byName.values());
        return { register, getWorker, findByCapability, list };
};
