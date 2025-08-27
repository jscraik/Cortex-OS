// Protocol buffer types for the FAISS gRPC API (mirrors faissd.proto)
export interface DocumentEmbedding {
  doc_id: string;
  embedding: number[];
  content?: string;
  metadata?: { [key: string]: string };
  source?: string;
}

export interface IndexConfig {
  dimension: number;
  index_type: string;
  distance_metric: string;
  n_clusters?: number;
  training_params?: { [key: string]: string };
}

export interface IndexStats {
  total_vectors: number;
  index_size_bytes: number;
  build_duration_ms: number;
  peak_memory_bytes: number;
  efficiency_metrics?: { [key: string]: number };
}

export interface BuildRequest {
  corpus_hash: string;
  embed_model: string;
  documents: DocumentEmbedding[];
  config: IndexConfig;
  metadata?: { [key: string]: string };
}

export interface BuildResponse {
  snapshot_id: string;
  cache_hit: boolean;
  document_count: number;
  build_timestamp: number;
  stats: IndexStats;
  warnings: string[];
}

export interface SearchFilters {
  min_score?: number;
  max_score?: number;
  metadata_filters?: { [key: string]: string };
  source_includes?: string[];
  source_excludes?: string[];
}

export interface SearchRequest {
  snapshot_id: string;
  query_vector: number[];
  top_k: number;
  filters?: SearchFilters;
  include_content?: boolean;
}

export interface SearchResult {
  doc_id: string;
  score: number;
  rank: number;
  content?: string;
  metadata?: { [key: string]: string };
  source?: string;
}

export interface SearchResponse {
  results: SearchResult[];
  search_latency_ms: number;
  total_documents: number;
  search_metadata?: { [key: string]: string };
}
