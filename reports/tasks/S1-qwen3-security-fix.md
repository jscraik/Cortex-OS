# Task S1: Qwen3 Reranker Security Fix
**Priority**: CRITICAL  
**Estimated Time**: 2 days  
**Risk Level**: High - Template Injection Vulnerability

## Problem Statement
The `Qwen3Reranker` class in `/packages/rag/src/pipeline/qwen3-reranker.ts` contains a critical template injection vulnerability at lines 194-288 where user-controlled input is directly embedded into a Python script template.

## Test-First Implementation

### Step 1: RED - Write Failing Security Tests
```typescript
// packages/rag/src/pipeline/__tests__/qwen3-reranker.security.test.ts
import { describe, it, expect } from 'vitest';
import { Qwen3Reranker, RerankDocument } from '../qwen3-reranker';

describe('Qwen3Reranker Security', () => {
  const reranker = new Qwen3Reranker();

  it('should reject template injection in query', async () => {
    const maliciousQuery = '${__import__("os").system("rm -rf /")}';
    const docs: RerankDocument[] = [{ id: '1', text: 'safe content' }];
    
    await expect(reranker.rerank(maliciousQuery, docs))
      .rejects.toThrow('Invalid query: dangerous patterns detected');
  });

  it('should reject code injection via document text', async () => {
    const query = 'safe query';
    const maliciousDocs: RerankDocument[] = [
      { id: '1', text: '"; import os; os.system("echo pwned"); #' }
    ];
    
    await expect(reranker.rerank(query, maliciousDocs))
      .rejects.toThrow('Invalid document text: dangerous patterns detected');
  });

  it('should reject eval/exec patterns', async () => {
    const query = 'eval("malicious code")';
    const docs: RerankDocument[] = [{ id: '1', text: 'safe' }];
    
    await expect(reranker.rerank(query, docs))
      .rejects.toThrow('Invalid query: dangerous patterns detected');
  });

  it('should handle legitimate scientific content safely', async () => {
    const query = 'machine learning model evaluation';
    const docs: RerankDocument[] = [
      { id: '1', text: 'This model uses evaluation metrics like F1 score' },
      { id: '2', text: 'Performance evaluation shows 95% accuracy' }
    ];
    
    const result = await reranker.rerank(query, docs);
    expect(result).toBeDefined();
    expect(result.length).toBeLessThanOrEqual(2);
  });

  it('should validate input length limits', async () => {
    const longQuery = 'a'.repeat(10000);
    const docs: RerankDocument[] = [{ id: '1', text: 'safe' }];
    
    await expect(reranker.rerank(longQuery, docs))
      .rejects.toThrow('Query too long: maximum 1000 characters');
  });
});
```

### Step 2: GREEN - Implement Security Fixes
```typescript
// packages/rag/src/pipeline/qwen3-reranker.ts
import { z } from 'zod';
import { spawn } from 'child_process';
import { tmpdir } from 'os';
import { join } from 'path';
import { writeFile, unlink } from 'fs/promises';

// Input validation schemas
const QuerySchema = z.string()
  .min(1, 'Query cannot be empty')
  .max(1000, 'Query too long: maximum 1000 characters')
  .refine((val) => !/[`${}\\";]/.test(val), 'Invalid characters detected')
  .refine((val) => !/__import__|import\s+os|eval\(|exec\(|\bos\.system/.test(val), 'Dangerous patterns detected');

const DocumentTextSchema = z.string()
  .max(5000, 'Document text too long: maximum 5000 characters')
  .refine((val) => !/[`${}\\";]/.test(val), 'Invalid characters in document text')
  .refine((val) => !/__import__|import\s+os|eval\(|exec\(|\bos\.system/.test(val), 'Dangerous patterns in document text');

const RerankDocumentSchema = z.object({
  id: z.string(),
  text: DocumentTextSchema,
  score: z.number().optional()
});

export class SecureQwen3Reranker implements Reranker {
  private readonly modelPath: string;
  private readonly maxLength: number;
  private readonly topK: number;
  private readonly batchSize: number;
  private readonly cacheDir: string;
  private readonly pythonPath: string;
  private readonly timeoutMs: number;

  constructor(options: Qwen3RerankOptions = {}) {
    // ... existing constructor logic
  }

  /**
   * Validate all inputs before processing
   */
  private validateInputs(query: string, documents: RerankDocument[]): void {
    // Validate query
    QuerySchema.parse(query);
    
    // Validate all documents
    documents.forEach(doc => RerankDocumentSchema.parse(doc));
  }

  /**
   * Secure reranking using file-based communication instead of stdin
   */
  async rerank(
    query: string,
    documents: RerankDocument[],
    topK?: number,
  ): Promise<RerankDocument[]> {
    if (documents.length === 0) {
      return [];
    }

    // CRITICAL: Validate inputs first
    this.validateInputs(query, documents);

    const actualTopK = topK || this.topK;
    const batches = this.createBatches(documents, this.batchSize);
    const allScores: number[] = [];

    // Process documents in batches
    for (const batch of batches) {
      const batchScores = await this.secureScoreBatch(query, batch);
      allScores.push(...batchScores);
    }

    // Combine documents with scores and sort by relevance
    const scoredDocs = documents.map((doc, index) => ({
      ...doc,
      score: allScores[index] || 0,
    }));

    // Sort by score (highest first) and return top K
    scoredDocs.sort((a, b) => (b.score || 0) - (a.score || 0));
    return scoredDocs.slice(0, actualTopK);
  }

  /**
   * Secure batch scoring using temporary files instead of stdin
   */
  private async secureScoreBatch(query: string, documents: RerankDocument[]): Promise<number[]> {
    return new Promise(async (resolve, reject) => {
      const inputFile = join(tmpdir(), `qwen3-input-${Date.now()}-${Math.random()}.json`);
      const outputFile = join(tmpdir(), `qwen3-output-${Date.now()}-${Math.random()}.json`);

      try {
        // Write input to temporary file
        const input = {
          query,
          documents: documents.map((doc) => doc.text),
          model_path: this.modelPath,
          max_length: this.maxLength,
          input_file: inputFile,
          output_file: outputFile
        };

        await writeFile(inputFile, JSON.stringify(input));

        // Execute Python script with file paths
        const pythonScript = this.getSecurePythonScript();
        const child = spawn(this.pythonPath, ['-c', pythonScript, inputFile, outputFile], {
          stdio: ['ignore', 'pipe', 'pipe'], // No stdin
          env: {
            ...process.env,
            TRANSFORMERS_CACHE: this.cacheDir,
            HF_HOME: this.cacheDir,
          },
        });

        let stderr = '';
        child.stderr?.on('data', (data) => {
          stderr += data.toString();
        });

        const timer = setTimeout(() => {
          child.kill();
          reject(new Error('Qwen3 reranker timed out'));
        }, this.timeoutMs);

        child.on('close', async (code) => {
          clearTimeout(timer);
          
          try {
            // Clean up input file
            await unlink(inputFile).catch(() => {});

            if (code !== 0) {
              reject(new Error(`Qwen3 reranker failed with code ${code}: ${stderr}`));
              return;
            }

            // Read output from file
            const output = await readFile(outputFile, 'utf-8');
            const result = JSON.parse(output);
            
            // Clean up output file
            await unlink(outputFile).catch(() => {});

            if (result.error) {
              reject(new Error(`Qwen3 reranker error: ${result.error}`));
            } else {
              resolve(result.scores || []);
            }
          } catch (err) {
            reject(new Error(`Failed to process Qwen3 reranker output: ${err}`));
          }
        });

        child.on('error', (err) => {
          reject(new Error(`Failed to spawn Qwen3 reranker process: ${err}`));
        });

      } catch (error) {
        // Clean up files on error
        await unlink(inputFile).catch(() => {});
        await unlink(outputFile).catch(() => {});
        reject(error);
      }
    });
  }

  /**
   * Generate secure Python script with file-based I/O
   */
  private getSecurePythonScript(): string {
    return `
import json
import sys
import os
import tempfile
from pathlib import Path

def secure_rerank():
    try:
        if len(sys.argv) != 3:
            raise ValueError("Usage: script.py input_file output_file")
        
        input_file = sys.argv[1]
        output_file = sys.argv[2]
        
        # Validate file paths
        input_path = Path(input_file)
        output_path = Path(output_file)
        
        if not input_path.exists():
            raise FileNotFoundError(f"Input file not found: {input_file}")
        
        # Security: Ensure files are in temp directory
        temp_dir = Path(tempfile.gettempdir())
        if not input_path.is_relative_to(temp_dir) or not output_path.is_relative_to(temp_dir):
            raise SecurityError("File paths must be in temporary directory")
        
        # Read sanitized input
        with open(input_file, 'r') as f:
            input_data = json.load(f)
        
        query = input_data['query']
        documents = input_data['documents']
        model_path = input_data['model_path']
        max_length = input_data.get('max_length', 512)
        
        # Additional input validation in Python
        if len(query) > 1000 or len(query) == 0:
            raise ValueError("Invalid query length")
        
        for doc in documents:
            if len(doc) > 5000:
                raise ValueError("Document too long")
        
        # Import ML libraries only after validation
        import torch
        from transformers import AutoTokenizer, AutoModel
        
        # ... rest of the ML processing logic
        
        scores = []
        # ... ML processing without eval/exec
        
        # Write results to output file
        result = {"scores": scores}
        with open(output_file, 'w') as f:
            json.dump(result, f)
            
    except Exception as e:
        error_result = {"error": str(e)}
        try:
            with open(output_file, 'w') as f:
                json.dump(error_result, f)
        except:
            pass
        sys.exit(1)

if __name__ == "__main__":
    secure_rerank()
`;
  }

  // ... rest of existing methods
}
```

### Step 3: REFACTOR - Optimize Implementation
```typescript
// Add caching and performance optimizations
class CachedSecureQwen3Reranker extends SecureQwen3Reranker {
  private scoreCache = new Map<string, number[]>();
  
  private getCacheKey(query: string, documents: RerankDocument[]): string {
    const docTexts = documents.map(d => d.text).join('|');
    return `${query}:${docTexts}`;
  }
  
  async rerank(query: string, documents: RerankDocument[], topK?: number): Promise<RerankDocument[]> {
    const cacheKey = this.getCacheKey(query, documents);
    
    if (this.scoreCache.has(cacheKey)) {
      const cachedScores = this.scoreCache.get(cacheKey)!;
      return this.applyCachedScores(documents, cachedScores, topK);
    }
    
    const result = await super.rerank(query, documents, topK);
    const scores = result.map(r => r.score || 0);
    this.scoreCache.set(cacheKey, scores);
    
    return result;
  }
}
```

## Acceptance Criteria
- [ ] All template injection tests pass
- [ ] Input validation catches all dangerous patterns
- [ ] File-based I/O replaces stdin injection vector
- [ ] Performance regression < 10%
- [ ] Security scan shows zero high/critical vulnerabilities
- [ ] Existing functionality preserved for legitimate use cases

## Rollback Strategy
1. **Feature Flag**: Set `ENABLE_SECURE_RERANKER=false` in environment
2. **Fallback**: Use simple cosine similarity for reranking
3. **Database Cleanup**: Script to identify affected queries
4. **Monitoring**: Alert on performance degradation > 20%

## Validation Commands
```bash
# Run security-specific tests
npm test -- qwen3-reranker.security.test.ts

# Run full test suite
npm run test:coverage:threshold

# Security vulnerability scan
npm run security:scan:comprehensive

# Performance benchmark
npm run test:performance -- qwen3-reranker
```

## Files Modified
- `/packages/rag/src/pipeline/qwen3-reranker.ts` - Main implementation
- `/packages/rag/src/pipeline/__tests__/qwen3-reranker.security.test.ts` - Security tests
- `/packages/rag/src/pipeline/__tests__/qwen3-reranker.test.ts` - Updated existing tests
