type ManifestToolEntry = {
    name: string;
    requiresOAuth: boolean;
    scopes: string[];
};

const registry = new Map<string, ManifestToolEntry>();

export function recordManifestTool(entry: ManifestToolEntry): void {
    const scopes = Array.from(new Set(entry.scopes)).sort();
    registry.set(entry.name, {
        name: entry.name,
        requiresOAuth: entry.requiresOAuth,
        scopes,
    });
}

export function getManifestTools(): ManifestToolEntry[] {
    return Array.from(registry.values()).sort((a, b) => a.name.localeCompare(b.name));
}

export function resetManifestTools(): void {
    registry.clear();
}

