export async function ingestText(source, text, E, S) {
  const chunk = { id: `${source}#0`, text, source };
  const [emb] = await E.embed([chunk.text]);
  await S.upsert([{ ...chunk, embedding: emb }]);
}
//# sourceMappingURL=ingest.js.map
