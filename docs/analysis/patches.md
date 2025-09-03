# Critical Bug Fixes - Patch Hints

## 1. Fix String Escaping Issues

### MLXAdapter TypeScript fixes:

```diff
--- a/packages/model-gateway/src/adapters/mlx-adapter.ts
+++ b/packages/model-gateway/src/adapters/mlx-adapter.ts
@@ -219,7 +219,7 @@
       formatted.append(f"{role}: {content}")

     formatted.append("Assistant: ")  // Prompt for response
-    return "\\n".join(formatted)
+    return "\n".join(formatted)
   }

   private _format_vl_messages(self, messages: list[dict[str, str]]) -> str:
@@ -224,7 +224,7 @@
   private formatVLMessages(messages: Array<{ role: string; content: string }>): string {
     // Simple formatting for VL models
-    return "\\n".join([f"{msg['role']}: {msg['content']}" for msg in messages])
+    return "\n".join([f"{msg['role']}: {msg['content']}" for msg in messages])
   }
```

### Python MLX script fixes:

```diff
--- a/apps/cortex-py/src/mlx/mlx_unified.py
+++ b/apps/cortex-py/src/mlx/mlx_unified.py
@@ -219,7 +219,7 @@
         formatted.append(f"{role}: {content}")

         formatted.append("Assistant: ")  # Prompt for response
-        return "\\n".join(formatted)
+        return "\n".join(formatted)

     def _format_vl_messages(self, messages: list[dict[str, str]]) -> str:
@@ -224,7 +224,7 @@
     def _format_vl_messages(self, messages: list[dict[str, str]]) -> str:
         """Format messages for vision-language models"""
         # Simple formatting for VL models
-        return "\\n".join([f"{msg['role']}: {msg['content']}" for msg in messages])
+        return "\n".join([f"{msg['role']}: {msg['content']}" for msg in messages])
```

## 2. Fix Array Indexing Validation

```diff
--- a/packages/model-gateway/src/adapters/mlx-adapter.ts
+++ b/packages/model-gateway/src/adapters/mlx-adapter.ts
@@ -270,9 +270,14 @@
       ]);

       const data = JSON.parse(result);
+
+      if (!Array.isArray(data) || data.length === 0) {
+        throw new Error('Invalid embedding response: expected non-empty array');
+      }

       return MLXEmbeddingResponseSchema.parse({
-        embedding: data[0], // Python script returns array of arrays, take first
+        embedding: data[0],
         model: modelName,
         dimensions: modelConfig.dimensions,
         usage: {
```

## 3. Fix Code Duplication in generateEmbeddings

```diff
--- a/packages/model-gateway/src/adapters/mlx-adapter.ts
+++ b/packages/model-gateway/src/adapters/mlx-adapter.ts
@@ -293,8 +293,12 @@
   async generateEmbeddings(texts: string[], model?: string): Promise<MLXEmbeddingResponse[]> {
     const modelName = (model as MLXModelName) || 'qwen3-embedding-4b-mlx';
+    const modelConfig = MLX_MODELS[modelName];
+
+    if (!modelConfig || modelConfig.type !== 'embedding') {
+      throw new Error(`Unsupported MLX embedding model: ${modelName}`);
+    }

     try {
-      const modelConfig = MLX_MODELS[modelName];
       const result = await this.executePythonScript([
         ...texts,
         '--model',
@@ -312,7 +316,6 @@
         throw new Error('Expected array of embeddings from MLX script');
       }

-      const modelConfig = MLX_MODELS[modelName];
       const totalTokens = texts.reduce((sum, text) => sum + this.estimateTokenCount(text), 0);

       return data.map((embedding: number[], index: number) =>
```

## 4. Replace Console Statements with Proper Logging

```diff
--- a/packages/model-gateway/src/adapters/mlx-adapter.ts
+++ b/packages/model-gateway/src/adapters/mlx-adapter.ts
@@ -1,6 +1,7 @@
 import { spawn } from 'child_process';
 import path from 'path';
 import { z } from 'zod';
+import { logger } from '@cortex-os/utils/logger';

 // ... rest of imports

@@ -192,7 +193,7 @@
     // Validate model path exists
     if (!(await this.validateModelPath(modelConfig.path))) {
-      console.warn(`Model path not found: ${modelConfig.path}, attempting to download...`);
+      logger.warn('Model path not found', { path: modelConfig.path, action: 'attempting_download' });
     }

@@ -235,7 +236,7 @@
       });
     } catch (error) {
-      console.error('MLX chat generation failed:', error);
+      logger.error('MLX chat generation failed', { error: error.message, model: modelName });
       throw new Error(
         `MLX chat failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
       );
```

## 5. Make Paths Configurable

```diff
--- a/packages/model-gateway/src/adapters/mlx-adapter.ts
+++ b/packages/model-gateway/src/adapters/mlx-adapter.ts
@@ -8,6 +8,12 @@
 import path from 'path';
 import { z } from 'zod';

+// Configuration paths - can be overridden via environment
+const HUGGINGFACE_CACHE = process.env.HF_HOME || '/Volumes/ExternalSSD/huggingface_cache';
+const MLX_CACHE_DIR = process.env.MLX_CACHE_DIR || '/Volumes/ExternalSSD/ai-cache';
+const DEFAULT_MODEL_BASE_PATH = process.env.MLX_MODEL_BASE_PATH || '/Volumes/ExternalSSD/huggingface_cache';
+
+
 // MLX model configurations from ExternalSSD
 const MLX_MODELS = {
   // Embedding models from HuggingFace cache
@@ -11,7 +17,7 @@
 const MLX_MODELS = {
   // Embedding models from HuggingFace cache
   'qwen3-embedding-0.6b-mlx': {
-    path: '/Volumes/ExternalSSD/huggingface_cache/models--Qwen--Qwen3-Embedding-0.6B',
+    path: `${DEFAULT_MODEL_BASE_PATH}/models--Qwen--Qwen3-Embedding-0.6B`,
     hf_path: 'Qwen/Qwen3-Embedding-0.6B',
     type: 'embedding',
     memory_gb: 1.0,
@@ -389,8 +395,8 @@
         env: {
           ...process.env,
           PYTHONPATH: path.resolve(process.cwd(), 'apps/cortex-py/src'),
-          HF_HOME: '/Volumes/ExternalSSD/huggingface_cache',
-          TRANSFORMERS_CACHE: '/Volumes/ExternalSSD/huggingface_cache',
-          MLX_CACHE_DIR: '/Volumes/ExternalSSD/ai-cache',
+          HF_HOME: HUGGINGFACE_CACHE,
+          TRANSFORMERS_CACHE: HUGGINGFACE_CACHE,
+          MLX_CACHE_DIR: MLX_CACHE_DIR,
         },
       });
```

## 6. Add Input Validation Helper

```diff
--- a/packages/model-gateway/src/adapters/mlx-adapter.ts
+++ b/packages/model-gateway/src/adapters/mlx-adapter.ts
@@ -160,6 +160,16 @@
 export type MLXChatRequest = z.infer<typeof MLXChatRequestSchema>;
 export type MLXChatResponse = z.infer<typeof MLXChatResponseSchema>;

+/**
+ * Helper function to validate and get model config
+ */
+function getValidatedModelConfig(modelName: MLXModelName, expectedType: string): ModelConfig {
+  const modelConfig = MLX_MODELS[modelName];
+  if (!modelConfig || modelConfig.type !== expectedType) {
+    throw new Error(`Unsupported MLX ${expectedType} model: ${modelName}`);
+  }
+  return modelConfig;
+}
+
 /**
  * MLX Adapter for model gateway
  */
@@ -184,12 +194,8 @@
    */
   async generateChat(request: MLXChatRequest): Promise<MLXChatResponse> {
     const modelName = (request.model as MLXModelName) || 'qwen3-coder-30b-mlx';
-    const modelConfig = MLX_MODELS[modelName];
-
-    if (!modelConfig || modelConfig.type !== 'chat') {
-      throw new Error(`Unsupported MLX chat model: ${modelName}`);
-    }
+    const modelConfig = getValidatedModelConfig(modelName, 'chat');

     // Validate model path exists
     if (!(await this.validateModelPath(modelConfig.path))) {
```

These patches address the most critical issues identified in the code review. Apply them in order of priority: string escaping fixes first (quick wins), then validation improvements, followed by structural changes.
