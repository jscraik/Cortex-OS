export declare class SecureNeo4j {
    private driver;
    private sessionPool;
    private maxPoolSize;
    private activeSessions;
    constructor(uri: string, user: string, pass: string);
    close(): Promise<void>;
    private getSession;
    private returnSession;
    upsertNode(node: {
        id: string;
        label: string;
        props: Record<string, unknown>;
    }): Promise<void>;
    upsertRel(rel: {
        from: string;
        to: string;
        type: string;
        props?: Record<string, unknown>;
    }): Promise<void>;
    neighborhood(nodeId: string, depth?: number): Promise<{
        nodes: {
            id: string;
            label: string;
            props: Record<string, unknown>;
        }[];
        rels: {
            from: string;
            to: string;
            type: string;
            props: Record<string, unknown>;
        }[];
    }>;
    private isRecord;
    private validateProperties;
    private validatePropertyKey;
    private validatePropertyValue;
    private validateStringProperty;
    private validateObjectProperty;
    getPoolStats(): {
        activeSessions: number;
        pooledSessions: number;
        maxPoolSize: number;
    };
}
