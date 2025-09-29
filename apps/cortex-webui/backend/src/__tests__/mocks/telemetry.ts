export interface MockCounter {
        add: (value: number, attributes?: Record<string, string>) => void;
}

export function createCounter(): MockCounter {
        return {
                add: () => {
                        // noop mock implementation
                },
        };
}
