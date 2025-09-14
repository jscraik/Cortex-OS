import { z } from 'zod';

/**
 * Registry A2A event schemas for inter-package communication
 */

// Component Registered Event
export const ComponentRegisteredEventSchema = z.object({
	componentId: z.string(),
	name: z.string(),
	version: z.string(),
	type: z.enum(['service', 'library', 'tool', 'integration']),
	namespace: z.string(),
	metadata: z.record(z.any()).optional(),
	registeredBy: z.string(),
	registeredAt: z.string(),
});

// Component Updated Event
export const ComponentUpdatedEventSchema = z.object({
	componentId: z.string(),
	previousVersion: z.string(),
	newVersion: z.string(),
	changes: z.array(z.string()),
	updatedBy: z.string(),
	updatedAt: z.string(),
});

// Dependency Resolved Event
export const DependencyResolvedEventSchema = z.object({
	componentId: z.string(),
	dependencyId: z.string(),
	dependencyName: z.string(),
	version: z.string(),
	resolved: z.boolean(),
	resolvedAt: z.string(),
});

// Registry Query Event
export const RegistryQueryEventSchema = z.object({
	queryId: z.string(),
	query: z.string(),
	filters: z.record(z.any()).optional(),
	resultsCount: z.number().int().nonnegative(),
	queriedBy: z.string(),
	queriedAt: z.string(),
});

// Export event type definitions
export type ComponentRegisteredEvent = z.infer<
	typeof ComponentRegisteredEventSchema
>;
export type ComponentUpdatedEvent = z.infer<typeof ComponentUpdatedEventSchema>;
export type DependencyResolvedEvent = z.infer<
	typeof DependencyResolvedEventSchema
>;
export type RegistryQueryEvent = z.infer<typeof RegistryQueryEventSchema>;

// Helper function to create registry events
export const createRegistryEvent = {
	componentRegistered: (data: ComponentRegisteredEvent) => ({
		type: 'registry.component.registered' as const,
		data: ComponentRegisteredEventSchema.parse(data),
	}),
	componentUpdated: (data: ComponentUpdatedEvent) => ({
		type: 'registry.component.updated' as const,
		data: ComponentUpdatedEventSchema.parse(data),
	}),
	dependencyResolved: (data: DependencyResolvedEvent) => ({
		type: 'registry.dependency.resolved' as const,
		data: DependencyResolvedEventSchema.parse(data),
	}),
	registryQueried: (data: RegistryQueryEvent) => ({
		type: 'registry.query.executed' as const,
		data: RegistryQueryEventSchema.parse(data),
	}),
};
