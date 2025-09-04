import { z } from "zod";

const requestSchema = z.object({
        text: z.string().min(1),
});

const responseSchema = z.object({
        embeddings: z.array(z.array(z.number())),
});

const DEFAULT_SERVICE_URL = "https://127.0.0.1:8765";

export async function generateEmbedding(text: string): Promise<Float32Array> {
        const { text: validText } = requestSchema.parse({ text });
        const baseUrl = process.env.MLX_SERVICE_URL || DEFAULT_SERVICE_URL;
        const parsed = new URL(baseUrl);
        const isLocal = ["127.0.0.1", "localhost"].includes(parsed.hostname);
        if (parsed.protocol !== "https:" && !isLocal) {
                throw new Error("MLX service must use HTTPS");
        }

        try {
                const res = await fetch(`${baseUrl}/embed`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ text: validText }),
                });

                if (!res.ok) {
                        throw new Error(`MLX embedding failed: ${res.status} ${res.statusText}`);
                }

                const json = await res.json();
                const data = responseSchema.parse(json);

                if (!data.embeddings.length) {
                        throw new Error("MLX service returned no embeddings");
                }

                return Float32Array.from(data.embeddings[0]);
        } catch (primaryError) {
                try {
                        const frontierUrl = process.env.FRONTIER_API_URL;
                        if (!frontierUrl) {
                                throw primaryError;
                        }
                        const frontierParsed = new URL(frontierUrl);
                        if (frontierParsed.protocol !== "https:") {
                                throw new Error("Frontier API must use HTTPS");
                        }

                        const res = await fetch(`${frontierUrl}/embed`, {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ text: validText }),
                        });

                        if (!res.ok) {
                                throw new Error(`Frontier embedding failed: ${res.status} ${res.statusText}`);
                        }

                        const json = await res.json();
                        const data = responseSchema.parse(json);

                        if (!data.embeddings.length) {
                                throw new Error("Frontier service returned no embeddings");
                        }

                        return Float32Array.from(data.embeddings[0]);
                } catch (error) {
                        throw new Error(
                                `Failed to generate embeddings: ${error instanceof Error ? error.message : "Unknown error"}`,
                        );
                }
        }
}
