export interface Evidence {
  id: string;
  taskId: string;
  claim: string;
  confidence: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  source: {
    type: string;
    id: string;
    metadata?: Record<string, unknown>;
  };
  timestamp: string;
  tags: string[];
  content?: string;
  relatedEvidenceIds: string[];
}
export interface ConfidenceMetrics {
  averageConfidence: number;
  confidenceDistribution: Record<string, number>;
  reliabilityScore: number;
}
export interface RiskAssessment {
  overallRisk: 'low' | 'medium' | 'high' | 'critical';
  specificRisks: Array<{
    type: string;
    description: string;
    mitigation: string;
  }>;
}
export declare function summarizeEvidence(evidenceCollection: Evidence[]): string;
export declare function invokeRagAnalysis(
  aiCapabilities: {
    ragQuery: (args: { query: string; systemPrompt: string }) => Promise<{
      answer: string;
    }>;
  },
  evidenceSummary: string,
  taskContext: string,
): Promise<{
  answer: string;
}>;
export declare function parseInsightsResponse(answer: string): {
  summary: string;
  keyFindings: string[];
  recommendations: string[];
};
export declare function generateFallbackInsights(
  evidenceCollection: Evidence[],
  taskContext: string,
  calculateConfidenceMetrics: (evidence: Evidence[]) => ConfidenceMetrics,
  analyzeRiskDistribution: (evidence: Evidence[]) => RiskAssessment,
): {
  summary: string;
  keyFindings: string[];
  riskAssessment: RiskAssessment;
  recommendations: string[];
  confidenceMetrics: ConfidenceMetrics;
};
export declare const isEmptyAnswer: (answer?: string) => boolean;
export declare const isInvalidSummary: (summary: string) => boolean;
//# sourceMappingURL=index.d.ts.map
