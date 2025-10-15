/**
 * Phase C.2: Remote MCP Orchestration Tests (TDD - RED Phase)
 *
 * Test Suite 11: Multi-Step Wikidata Workflow
 * 
 * Tests the orchestration of vector → claims → SPARQL workflow with metadata
 * stitching, network error fallback, and ranking preservation.
 *
 * @see tasks/wikidata-semantic-layer-integration/tdd-plan.md - Phase C.2
 * @see tasks/wikidata-semantic-layer-integration/PHASE_C2_IMPLEMENTATION.md
 */

import { describe, expect, test, beforeEach, vi } from 'vitest';
import type { ConnectorEntry } from '@cortex-os/protocol';
import type { Store } from '../../src/lib/types.js';
import {
  executeWikidataWorkflow,
  stitchWikidataMetadata,
  captureSparqlMetadata,
  executeWithFallback,
} from '../../src/integrations/remote-mcp.js';

// Mock types for testing
interface VectorSearchResult {
  qid: string;
  score: number;
  title?: string;
  content?: string;
}

interface ClaimsResult {
  claims: Array<{
    guid: string;
    property: string;
    value?: string;
  }>;
}

interface SparqlResult {
  query: string;
  results: Array<Record<string, unknown>>;
}

interface WorkflowResult {
  content: string;
  source: string;
  metadata: {
    wikidata?: {
      qid?: string;
      claimGuid?: string;
      sparql?: string;
    };
    fallbackReason?: string;
    brand: string;
  };
}

describe('brAInwav Phase C.2: Remote MCP Orchestration', () => {
  describe('Test Suite 11: Multi-Step Wikidata Workflow', () => {
    let mockWikidataConnector: ConnectorEntry;
    let mockMCPClient: any;
    let mockLocalStore: any;

    beforeEach(() => {
      // Mock Wikidata connector with remoteTools from previous phases
      mockWikidataConnector = {
        id: 'wikidata',
        name: 'Wikidata Semantic Search',
        displayName: 'Wikidata Semantic Search',
        version: '2024.09.18',
        endpoint: 'https://wd-mcp.wmcloud.org/mcp/',
        auth: { type: 'none' },
        scopes: ['wikidata:vector-search', 'wikidata:claims', 'wikidata:sparql'],
        ttlSeconds: 1800,
        metadata: {
          dumpDate: '2024-09-18',
          vectorModel: 'jina-embeddings-v3',
          embeddingDimensions: 1024,
          supportsMatryoshka: true,
          brand: 'brAInwav',
        },
        remoteTools: [
          {
            name: 'vector_search_items',
            description: 'Semantic vector search over Wikidata items',
            tags: ['vector', 'search', 'items'],
            scopes: ['wikidata:vector-search'],
          },
          {
            name: 'vector_search_properties',
            description: 'Semantic vector search over Wikidata properties',
            tags: ['vector', 'search', 'properties'],
            scopes: ['wikidata:vector-search'],
          },
          {
            name: 'get_claims',
            description: 'Retrieve structured claims for specific Wikidata entities by QID',
            tags: ['claims', 'entities'],
            scopes: ['wikidata:claims'],
          },
          {
            name: 'sparql',
            description: 'Execute SPARQL queries against the Wikidata knowledge graph',
            tags: ['sparql', 'graph', 'query'],
            scopes: ['wikidata:sparql'],
          },
        ],
      };

      // Mock MCP client
      mockMCPClient = {
        callTool: vi.fn(),
        initialize: vi.fn().mockResolvedValue({}),
        healthCheck: vi.fn().mockResolvedValue(true),
      };

      // Mock local store
      mockLocalStore = {
        query: vi.fn(),
        upsert: vi.fn(),
      };
    });

    test('C.2.1: should execute vector → claims → SPARQL workflow successfully', async () => {
      // Given: Mock MCP client returns structured responses for each step
      mockMCPClient.callTool
        .mockResolvedValueOnce({
          // Step 1: Vector search results
          results: [
            {
              qid: 'Q34743',
              score: 0.95,
              title: 'Alexander Graham Bell',
              content: 'Scottish-born inventor, scientist and engineer'
            }
          ]
        })
        .mockResolvedValueOnce({
          // Step 2: Claims results with GUID
          claims: [
            {
              guid: 'Q34743$abc123-def456-789',
              property: 'P569',
              value: '1847-03-03',
              description: 'date of birth'
            }
          ]
        })
        .mockResolvedValueOnce({
          // Step 3: SPARQL results with query text scoped to the QID
          query: `
            SELECT ?entity ?entityLabel ?property ?propertyLabel ?value ?valueLabel WHERE {
              VALUES ?entity { wd:Q34743 }
              ?entity ?prop ?statement .
              ?property wikibase:claim ?prop .
              ?statement ?ps ?value .
              ?property wikibase:statementProperty ?ps .
              SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
            }
            ORDER BY ?propertyLabel ?valueLabel
            LIMIT 100
          `,
          results: [
            { entity: 'Q34743', entityLabel: 'Alexander Graham Bell', propertyLabel: 'date of birth', value: '1847-03-03' }
          ]
        });

      // When: Execute the full Wikidata workflow
      const result = await executeWikidataWorkflow(
        'Who invented the telephone?',
        mockWikidataConnector,
        { mcpClient: mockMCPClient }
      );

      // Then: Should return complete workflow result with metadata
      expect(result.content).toContain('Alexander Graham Bell');
      expect(result.source).toBe('wikidata_workflow');
      expect(result.metadata.wikidata.qid).toBe('Q34743');
      expect(result.metadata.wikidata.claimGuid).toBe('Q34743$abc123-def456-789');
      expect(result.metadata.wikidata.sparql).toContain('SELECT ?entity');
      expect(result.metadata.wikidata.vectorResults?.[0]?.qid).toBe('Q34743');
      expect(result.metadata.wikidata.claims?.[0]?.guid).toBe('Q34743$abc123-def456-789');
      expect(result.metadata.wikidata.sparqlBindings?.[0]?.entity).toBe('Q34743');
      expect(result.metadata.brand).toBe('brAInwav');

      // Verify MCP client was called for each step
      expect(mockMCPClient.callTool).toHaveBeenCalledTimes(3);
      expect(mockMCPClient.callTool).toHaveBeenNthCalledWith(1, 'vector_search_items', expect.any(Object));
      expect(mockMCPClient.callTool).toHaveBeenNthCalledWith(2, 'get_claims', expect.any(Object));
      expect(mockMCPClient.callTool).toHaveBeenNthCalledWith(3, 'sparql', expect.any(Object));

      // The generated SPARQL query should reference the specific QID
      const [, sparqlPayload] = mockMCPClient.callTool.mock.calls[2];
      expect(sparqlPayload.query).toContain('wd:Q34743');
    });

    test('C.2.1a: should skip claims retrieval when disabled', async () => {
      mockMCPClient.callTool
        .mockResolvedValueOnce({
          results: [
            {
              qid: 'Q34743',
              score: 0.95,
              title: 'Alexander Graham Bell',
              content: 'Scottish-born inventor, scientist and engineer'
            }
          ]
        })
        .mockResolvedValueOnce({
          query: 'SELECT ?inventor WHERE { ?inventor wdt:P31 wd:Q5 . }',
          results: [
            { inventor: 'Q34743', label: 'Alexander Graham Bell' }
          ]
        });

      const result = await executeWikidataWorkflow(
        'Who invented the telephone?',
        mockWikidataConnector,
        { mcpClient: mockMCPClient, enableClaims: false }
      );

      expect(result.metadata.wikidata?.claimGuid).toBeUndefined();
      expect(result.metadata.wikidata?.qid).toBe('Q34743');
      expect(result.source).toBe('wikidata_workflow');
      expect(mockMCPClient.callTool).toHaveBeenCalledTimes(2);
      expect(mockMCPClient.callTool).not.toHaveBeenCalledWith('get_claims', expect.any(Object));
    });

    test('C.2.2: should stitch QIDs and claim GUIDs into metadata', async () => {
      // Given: Vector search result with QID and claims result with GUID
      const vectorResult: VectorSearchResult = {
        qid: 'Q34743',
        score: 0.95,
        title: 'Alexander Graham Bell',
        content: 'Scottish-born inventor'
      };

      const claimsResult: ClaimsResult = {
        claims: [
          {
            guid: 'Q34743$def456-ghi789-jkl012',
            property: 'P31',
            value: 'Q5' // instance of human
          }
        ]
      };

      // When: Stitch the metadata together
      const stitched = await stitchWikidataMetadata(vectorResult, claimsResult);

      // Then: Should combine QID and claim GUID with brAInwav branding
      expect(stitched.qid).toBe('Q34743');
      expect(stitched.claimGuid).toBe('Q34743$def456-ghi789-jkl012');
      expect(stitched.brand).toBe('brAInwav');
      expect(stitched.title).toBe('Alexander Graham Bell');
      expect(stitched.properties).toContain('P31');
    });

    test('C.2.3: should capture SPARQL query text in metadata.wikidata.sparql', async () => {
      // Given: SPARQL result with query text and results
      const sparqlResult: SparqlResult = {
        query: 'SELECT ?person WHERE { ?person wdt:P106 wd:Q901 . ?person wdt:P569 ?birth }',
        results: [
          { person: 'Q34743', birth: '1847-03-03' },
          { person: 'Q8735', birth: '1856-07-10' }
        ]
      };

      // When: Capture SPARQL metadata
      const metadata = await captureSparqlMetadata(sparqlResult);

      // Then: Should extract query information with brAInwav branding
      expect(metadata.sparql).toBe('SELECT ?person WHERE { ?person wdt:P106 wd:Q901 . ?person wdt:P569 ?birth }');
      expect(metadata.queryType).toBe('SELECT');
      expect(metadata.resultCount).toBe(2);
      expect(metadata.brand).toBe('brAInwav');
      expect(metadata.variables).toEqual(['person', 'birth']);
    });

    test('C.2.4: should fallback to local store when MCP server unreachable', async () => {
      // Given: MCP client throws network error and local store has results
      mockMCPClient.callTool.mockRejectedValue(new Error('Network error: Connection refused'));
      
      mockLocalStore.query.mockResolvedValue([
        {
          id: 'local-1',
          content: 'Local result about Alexander Graham Bell from cached data',
          score: 0.8,
          metadata: { source: 'local_cache' }
        }
      ]);

      // When: Execute workflow with network failure
      const result = await executeWikidataWorkflow(
        'Who invented the telephone?',
        mockWikidataConnector,
        { 
          mcpClient: mockMCPClient,
          localStore: mockLocalStore 
        }
      );

      // Then: Should fallback to local store with clear indication
      expect(result.source).toBe('local_fallback');
      expect(result.content).toContain('Local result about Alexander Graham Bell');
      expect(result.metadata.fallbackReason).toBe('network_error');
      expect(result.metadata.brand).toBe('brAInwav');
      expect(result.metadata.originalError).toContain('Connection refused');

      // Verify local store was queried
      expect(mockLocalStore.query).toHaveBeenCalledWith(
        expect.any(Array), // embedding
        expect.objectContaining({ k: expect.any(Number) })
      );
    });

    test('C.2.5: should preserve existing ranking when fallback occurs', async () => {
      // Given: Local store returns results in specific relevance order
      const localResults = [
        { id: '1', content: 'Result 1 - most relevant', score: 0.9 },
        { id: '2', content: 'Result 2 - moderately relevant', score: 0.8 },
        { id: '3', content: 'Result 3 - least relevant', score: 0.7 }
      ];

      mockLocalStore.query.mockResolvedValue(localResults);

      // When: Execute fallback with ranking preservation
      const result = await executeWithFallback(
        'test query',
        localResults,
        { preserveRanking: true }
      );

      // Then: Should maintain original relevance order
      expect(result).toHaveLength(3);
      expect(result[0].score).toBe(0.9);
      expect(result[0].content).toBe('Result 1 - most relevant');
      expect(result[1].score).toBe(0.8);
      expect(result[1].content).toBe('Result 2 - moderately relevant');
      expect(result[2].score).toBe(0.7);
      expect(result[2].content).toBe('Result 3 - least relevant');
      
      // Verify ranking metadata is preserved
      expect(result[0].metadata?.rank).toBe(1);
      expect(result[1].metadata?.rank).toBe(2);
      expect(result[2].metadata?.rank).toBe(3);
    });

    test('C.2.6: should handle partial workflow failures gracefully', async () => {
      // Given: Vector search succeeds but claims retrieval fails
      mockMCPClient.callTool
        .mockResolvedValueOnce({
          results: [{ qid: 'Q34743', score: 0.95, title: 'Alexander Graham Bell' }]
        })
        .mockRejectedValueOnce(new Error('Claims service unavailable'))
        .mockResolvedValueOnce({
          query: 'SELECT ?fallback WHERE { ?fallback a wd:Q5 }',
          results: []
        });

      // When: Execute workflow with partial failure
      const result = await executeWikidataWorkflow(
        'Who invented the telephone?',
        mockWikidataConnector,
        { mcpClient: mockMCPClient, enablePartialResults: true }
      );

      // Then: Should return partial results with clear indication
      expect(result.source).toBe('wikidata_partial');
      expect(result.metadata.wikidata.qid).toBe('Q34743');
      expect(result.metadata.wikidata.claimGuid).toBeUndefined();
      expect(result.metadata.partialFailure).toBe('claims_unavailable');
      expect(result.metadata.brand).toBe('brAInwav');
      expect(result.metadata.wikidata.vectorResults?.[0]?.qid).toBe('Q34743');
    });

    test('C.2.7: property queries should route to property search and skip downstream tools', async () => {
      mockMCPClient.callTool.mockResolvedValueOnce({
        results: [
          {
            qid: 'P31',
            score: 0.88,
            title: 'instance of',
            content: 'Defines that a thing is an instance of a class',
          },
        ],
      });

      const result = await executeWikidataWorkflow(
        'How is property P31 defined?',
        mockWikidataConnector,
        { mcpClient: mockMCPClient },
      );

      expect(mockMCPClient.callTool).toHaveBeenCalledTimes(1);
      const [toolName, params] = mockMCPClient.callTool.mock.calls[0];
      expect(toolName).toBe('vector_search_properties');
      expect(params).toMatchObject({ scope: 'properties', query: 'How is property P31 defined?' });
      expect(result.source).toBe('wikidata_workflow');
      expect(result.metadata.partialFailure).toBeUndefined();
    });

    test('C.2.8: should publish events and persist insights when hooks are provided', async () => {
      mockMCPClient.callTool
        .mockResolvedValueOnce({
          results: [
            {
              qid: 'Q34743',
              score: 0.95,
              title: 'Alexander Graham Bell',
              content: 'Scottish-born inventor, scientist and engineer',
            },
          ],
        })
        .mockResolvedValueOnce({
          claims: [
            {
              guid: 'Q34743$abc123-def456-789',
              property: 'P569',
              value: '1847-03-03',
              description: 'date of birth',
            },
          ],
        })
        .mockResolvedValueOnce({
          query: 'SELECT ?entity WHERE { VALUES ?entity { wd:Q34743 } }',
          results: [{ entity: 'Q34743' }],
        });

      const publishEvent = vi.fn();
      const persistInsight = vi.fn();

      const result = await executeWikidataWorkflow('Who invented the telephone?', mockWikidataConnector, {
        mcpClient: mockMCPClient,
        hooks: { publishEvent, persistInsight },
        queryId: 'test-query-123',
      });

      expect(result.source).toBe('wikidata_workflow');
      expect(publishEvent).toHaveBeenCalledTimes(1);
      const envelope = publishEvent.mock.calls[0][0];
      expect(envelope.type).toBe('rag.query.completed');
      expect(envelope.data.queryId).toBe('test-query-123');
      expect(persistInsight).toHaveBeenCalledTimes(1);
      expect(persistInsight).toHaveBeenCalledWith(
        expect.objectContaining({
          query: 'Who invented the telephone?',
          connectorId: 'wikidata',
          result: expect.objectContaining({ source: 'wikidata_workflow' }),
        }),
      );
    });
  });
});
