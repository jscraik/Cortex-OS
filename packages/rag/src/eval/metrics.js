// Retrieval metrics utilities for RAG evaluation
// Keep dependency-free for reuse across packages.
export function dcg(rels) {
    return rels.reduce((s, r, i) => s + (2 ** r - 1) / Math.log2(i + 2), 0);
}
export function idealBinaryAtK(totalRelevant, k) {
    const ones = Math.max(0, Math.min(totalRelevant, k));
    return Array.from({ length: k }, (_, i) => (i < ones ? 1 : 0));
}
export function ndcgAtK(binaryRelevances, k, totalRelevant) {
    const atK = binaryRelevances.slice(0, k);
    const ideal = idealBinaryAtK(totalRelevant, k);
    const denom = dcg(ideal);
    if (denom === 0)
        return 0;
    return dcg(atK) / denom;
}
export function precisionAtK(binaryRelevances, k) {
    const atK = binaryRelevances.slice(0, k);
    const hits = atK.reduce((s, r) => s + (r > 0 ? 1 : 0), 0);
    if (k <= 0)
        return 0;
    return hits / k;
}
export function recallAtK(binaryRelevances, k, totalRelevant) {
    if (totalRelevant <= 0)
        return 0;
    const atK = binaryRelevances.slice(0, k);
    const hits = atK.reduce((s, r) => s + (r > 0 ? 1 : 0), 0);
    return hits / totalRelevant;
}
//# sourceMappingURL=metrics.js.map