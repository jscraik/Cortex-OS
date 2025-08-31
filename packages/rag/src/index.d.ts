import { z } from 'zod';
declare const InputSchema: z.ZodObject<{
    config: any;
    query: any;
    json: z.ZodOptional<z.ZodBoolean>;
}, "strip">;
export type RAGInput = z.infer<typeof InputSchema>;
export declare function handleRAG(input: unknown): Promise<string>;
export {};
//# sourceMappingURL=index.d.ts.map
