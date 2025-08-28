export type SearchRequest = {
  text?: string;
  vector?: number[];
  topK?: number;
  tags?: string[];
};

export function normalizeSearch(
  req: SearchRequest,
): Required<Omit<SearchRequest, 'vector' | 'text'>> & Pick<SearchRequest, 'vector' | 'text'> {
  return {
    text: req.text,
    vector: req.vector,
    topK: req.topK ?? 8,
    tags: req.tags ?? [],
  };
}
