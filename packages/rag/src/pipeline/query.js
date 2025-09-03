export async function query(args, E, S) {
    const [emb] = await E.embed([args.q]);
    const hits = await S.query(emb, args.topK ?? 5);
    return hits;
}
//# sourceMappingURL=query.js.map
