import { z } from 'zod';
declare const InputSchema: z.ZodObject<{
    config: any;
    query: any;
    json: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>;
export type RAGInput = z.infer<typeof InputSchema>;
export declare function handleRAG(input: unknown): Promise<string>;
declare const _default: {
    handleRAG: typeof handleRAG;
};
export default _default;
//# sourceMappingURL=index.d.ts.map