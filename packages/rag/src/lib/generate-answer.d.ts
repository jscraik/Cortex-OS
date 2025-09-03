import type { MultiModelGenerator } from "../generation/multi-model.js";
import type { Document } from "./types.js";
export declare function generateAnswer(generator: MultiModelGenerator, query: string, documents: Document[], options?: {
    contextPrompt?: string;
    maxContextLength?: number;
}): Promise<{
    answer: string;
    provider: "mlx" | "ollama";
    usage: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    };
}>;
//# sourceMappingURL=generate-answer.d.ts.map
