import { z } from "zod";
import { byChars } from "../chunk/index.js";
const schema = z.object({
    source: z.string(),
    text: z.string().min(1),
    embedder: z.custom((e) => typeof e === "object" && e !== null && typeof e.embed === "function"),
    store: z.custom((s) => typeof s === "object" && s !== null && typeof s.upsert === "function"),
    chunkSize: z.number().int().positive().default(300),
    overlap: z.number().int().nonnegative().default(0),
});
export async function ingestText(params) {
    const { source, text, embedder, store, chunkSize, overlap } = schema.parse(params);
    const parts = byChars(text, chunkSize, overlap);
    const chunks = parts.map((p, i) => ({ id: `${source}#${i}`, text: p, source }));
    const embeddings = await embedder.embed(chunks.map((c) => c.text));
    if (embeddings.length !== chunks.length) {
        throw new Error(`Embedding count (${embeddings.length}) does not match chunk count (${chunks.length})`);
    }
    const withEmb = chunks.map((c, i) => ({ ...c, embedding: embeddings[i] }));
    await store.upsert(withEmb);
}
//# sourceMappingURL=ingest.js.map
