export function memoryStore() {
    const items = [];
    return {
        async upsert(chunks) {
            for (const c of chunks) {
                const i = items.findIndex((x) => x.id === c.id);
                if (i >= 0)
                    items[i] = c;
                else
                    items.push(c);
            }
        },
        async query(embedding, k = 5) {
            function sim(a, b) {
                if (!a || !b || a.length !== b.length)
                    return 0;
                let dot = 0, na = 0, nb = 0;
                for (let i = 0; i < a.length; i++) {
                    dot += a[i] * b[i];
                    na += a[i] * a[i];
                    nb += b[i] * b[i];
                }
                const denom = Math.sqrt(na) * Math.sqrt(nb) || 1;
                return dot / denom;
            }
            const scored = items
                .filter((x) => Array.isArray(x.embedding))
                .map((x) => ({ ...x, score: sim(embedding, x.embedding) }))
                .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
                .slice(0, k);
            return scored;
        },
    };
}
//# sourceMappingURL=memory.js.map
