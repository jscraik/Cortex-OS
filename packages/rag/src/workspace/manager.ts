export interface WorkspaceSpec {
	id: string;
	quotaMaxItems?: number;
}

export interface WorkspaceUsage {
	items: number;
}

export interface WorkspaceStoreIntrospection {
	countByWorkspace?: (workspaceId: string) => Promise<number>;
	deleteByWorkspace?: (workspaceId: string) => Promise<void>;
}

export class WorkspaceManager {
	private readonly usage = new Map<string, WorkspaceUsage>();

	async create(spec: WorkspaceSpec): Promise<void> {
		if (!spec.id) throw new Error('workspace id required');
		this.usage.set(spec.id, { items: 0 });
	}

	async delete(spec: { id: string }, base?: WorkspaceStoreIntrospection): Promise<void> {
		this.usage.delete(spec.id);
		if (base?.deleteByWorkspace) await base.deleteByWorkspace(spec.id);
	}

	async usageOf(id: string, base?: WorkspaceStoreIntrospection): Promise<WorkspaceUsage> {
		if (base?.countByWorkspace) {
			const items = await base.countByWorkspace(id);
			return { items };
		}
		return this.usage.get(id) ?? { items: 0 };
	}
}

export function createWorkspaceManager(): WorkspaceManager {
	return new WorkspaceManager();
}
