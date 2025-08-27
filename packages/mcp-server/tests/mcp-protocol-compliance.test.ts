/**
 * Comprehensive MCP Protocol Compliance Tests
 * Tests JSON-RPC 2.0 compliance, security, and protocol specifications
 * 
 * Context: Backend
 * Framework: Vitest
 * Specification: Model Context Protocol, JSON-RPC 2.0, Security Requirements
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js'
import fs from 'node:fs/promises'
import path from 'node:path'
import { Readable, Writable } from 'node:stream'
import { EventEmitter } from 'node:events'

// Import server under test

/**
 * Test Plan JSON
 * Traceability map to PRP requirements
 */
const TEST_PLAN = {
  "protocol_compliance": {
    "prd_id": "MCP-PROTO-001",
    "requirements": ["JSON-RPC 2.0", "Tool registration", "Error handling"],
    "coverage": "unit,integration,contract"
  },
  "security_validation": {
    "prd_id": "MCP-SEC-002", 
    "requirements": ["Authentication", "Path traversal prevention", "Input validation"],
    "coverage": "security,boundary"
  },
  "performance_requirements": {
    "prd_id": "MCP-PERF-003",
    "requirements": ["<100ms response", "2MB payload limit", "Concurrent requests"],
    "coverage": "performance,load"
  }
}

describe.skip('MCP Protocol Compliance Tests', () => {
  let mockStdin: Readable
  let mockStdout: Writable
  let server: Server
  let serverOutput: string[]

  beforeEach(async () => {
    // Reset environment
    delete process.env.CORTEX_MCP_TOKEN
    delete process.env.CORTEX_MCP_AUTH_DISABLED
    delete process.env.CORTEX_MCP_ROOT
    
    // Mock stdio streams
    mockStdin = new Readable({ read() {} })
    mockStdout = new Writable({
      write(chunk, encoding, callback) {
        serverOutput.push(chunk.toString())
        callback()
        return true
      }
    })
    
    serverOutput = []
    
    vi.spyOn(process, 'stdin', 'get').mockReturnValue(mockStdin as any)
    vi.spyOn(process, 'stdout', 'get').mockReturnValue(mockStdout as any)
    vi.spyOn(process, 'exit').mockImplementation((() => {}) as any)
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('JSON-RPC 2.0 Protocol Compliance', () => {
    it('should implement proper JSON-RPC 2.0 request/response format', async () => {
      // Set up authenticated environment
      process.env.CORTEX_MCP_TOKEN = 'test-token'
      process.env.CORTEX_MCP_ROOT = '/tmp/test-root'
      
      const transport = new StdioServerTransport()
      server = new Server({
        name: 'cortex-mcp',
        version: '0.1.1'
      }, {
        capabilities: { tools: {} }
      })

      // Test valid JSON-RPC 2.0 request format
      const validRequest = {
        jsonrpc: '2.0',
        id: 'test-001',
        method: 'tools/list',
        params: {}
      }

      // Mock server response handling
      const response = await server.request(validRequest as any)
      
      expect(response).toBeDefined()
      expect(response).toHaveProperty('jsonrpc', '2.0')
      expect(response).toHaveProperty('id', 'test-001')
      expect(response).toHaveProperty('result')
    })

    it('should handle malformed JSON-RPC requests with proper error codes', async () => {
      const malformedRequests = [
        // Missing jsonrpc field
        { id: 1, method: 'tools/list' },
        // Invalid jsonrpc version
        { jsonrpc: '1.0', id: 2, method: 'tools/list' },
        // Missing method
        { jsonrpc: '2.0', id: 3 },
        // Invalid method name
        { jsonrpc: '2.0', id: 4, method: 123 }
      ]

      for (const request of malformedRequests) {
        try {
          await server.request(request as any)
          expect.fail(`Should have thrown error for malformed request: ${JSON.stringify(request)}`)
        } catch (error) {
          expect(error).toBeInstanceOf(McpError)
          expect(error.code).toBeOneOf([
            ErrorCode.InvalidRequest,
            ErrorCode.MethodNotFound,
            ErrorCode.InvalidParams
          ])
        }
      }
    })

    it('should support batch requests per JSON-RPC 2.0 spec', async () => {
      const batchRequest = [
        { jsonrpc: '2.0', id: 'batch-1', method: 'tools/list' },
        { jsonrpc: '2.0', id: 'batch-2', method: 'tools/call', params: { name: 'ping', arguments: {} } }
      ]

      // Note: Actual batch support depends on SDK implementation
      // This test validates the expected behavior
      for (const request of batchRequest) {
        const response = await server.request(request as any)
        expect(response).toHaveProperty('jsonrpc', '2.0')
        expect(response).toHaveProperty('id', request.id)
      }
    })
  })

  describe('Tool Registration and Discovery', () => {
    beforeEach(() => {
      process.env.CORTEX_MCP_TOKEN = 'test-token'
      process.env.CORTEX_MCP_ROOT = '/tmp/test-root'
    })

    it('should register all required tools', async () => {
      const server = new Server({
        name: 'cortex-mcp', 
        version: '0.1.1'
      }, {
        capabilities: { tools: {} }
      })

      const toolsResponse = await server.request({
        jsonrpc: '2.0',
        id: 'tools-list',
        method: 'tools/list'
      } as any)

      expect(toolsResponse.result.tools).toHaveLength(3)
      
      const toolNames = toolsResponse.result.tools.map((tool: any) => tool.name)
      expect(toolNames).toContain('ping')
      expect(toolNames).toContain('http_get') 
      expect(toolNames).toContain('repo_file')
    })

    it('should provide proper tool schemas with required fields', async () => {
      const server = new Server({
        name: 'cortex-mcp',
        version: '0.1.1' 
      }, {
        capabilities: { tools: {} }
      })

      const toolsResponse = await server.request({
        jsonrpc: '2.0',
        id: 'tools-schema',
        method: 'tools/list'
      } as any)

      for (const tool of toolsResponse.result.tools) {
        // Validate required fields per MCP spec
        expect(tool).toHaveProperty('name')
        expect(tool).toHaveProperty('description')
        expect(tool).toHaveProperty('inputSchema')
        
        // Validate schema structure
        expect(tool.inputSchema).toHaveProperty('type', 'object')
        expect(tool.inputSchema).toHaveProperty('properties')
        
        if (tool.name === 'http_get') {
          expect(tool.inputSchema.required).toContain('url')
        }
        if (tool.name === 'repo_file') {
          expect(tool.inputSchema.required).toContain('relpath')
        }
      }
    })

    it('should handle unknown tool calls with MethodNotFound error', async () => {
      const server = new Server({
        name: 'cortex-mcp',
        version: '0.1.1'
      }, {
        capabilities: { tools: {} }
      })

      try {
        await server.request({
          jsonrpc: '2.0',
          id: 'unknown-tool',
          method: 'tools/call',
          params: { name: 'nonexistent_tool', arguments: {} }
        } as any)
        
        expect.fail('Should throw MethodNotFound error')
      } catch (error) {
        expect(error).toBeInstanceOf(McpError)
        expect(error.code).toBe(ErrorCode.MethodNotFound)
        expect(error.message).toContain('Unknown tool: nonexistent_tool')
      }
    })
  })

  describe('Security and Authentication', () => {
    it('should require authentication token by default', () => {
      // Clear any existing env vars
      delete process.env.CORTEX_MCP_TOKEN
      delete process.env.CORTEX_MCP_AUTH_DISABLED
      
      // Mock process.exit to capture the call
      const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {}) as any)
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      // This should trigger the security check and exit
      import('../src/server.ts')
      
      expect(exitSpy).toHaveBeenCalledWith(1)
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('CORTEX_MCP_TOKEN is not set')
      )
    })

    it('should allow authentication bypass only when explicitly enabled', () => {
      process.env.CORTEX_MCP_AUTH_DISABLED = 'true'
      
      const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {}) as any)
      
      // Should not exit when auth is explicitly disabled
      import('../src/server.ts')
      
      expect(exitSpy).not.toHaveBeenCalled()
    })

    it('should enforce hostname allowlist for http_get tool', async () => {
      process.env.CORTEX_MCP_TOKEN = 'test-token'
      
      const server = new Server({
        name: 'cortex-mcp',
        version: '0.1.1'
      }, {
        capabilities: { tools: {} }
      })

      const disallowedUrls = [
        'https://malicious.com/api',
        'http://localhost:8080/admin',
        'https://internal.company.com/secrets',
        'ftp://anonymous@bad-site.org/file'
      ]

      for (const url of disallowedUrls) {
        try {
          await server.request({
            jsonrpc: '2.0',
            id: 'security-test',
            method: 'tools/call',
            params: { name: 'http_get', arguments: { url } }
          } as any)
          
          expect.fail(`Should reject disallowed URL: ${url}`)
        } catch (error) {
          expect(error).toBeInstanceOf(McpError)
          expect(error.code).toBe(ErrorCode.InvalidParams)
          expect(error.message).toContain('not in allowlist')
        }
      }
    })

    it('should prevent path traversal in repo_file tool', async () => {
      process.env.CORTEX_MCP_TOKEN = 'test-token'
      process.env.CORTEX_MCP_ROOT = '/tmp/test-root'

      const server = new Server({
        name: 'cortex-mcp',
        version: '0.1.1'
      }, {
        capabilities: { tools: {} }
      })

      const maliciousPaths = [
        '../../../etc/passwd',
        '..\\..\\Windows\\System32\\config\\SAM',
        '/etc/shadow',
        'C:\\Windows\\System32\\drivers\\etc\\hosts',
        '../../../../root/.ssh/id_rsa',
        './../../secrets/api_keys.txt'
      ]

      for (const maliciousPath of maliciousPaths) {
        try {
          await server.request({
            jsonrpc: '2.0', 
            id: 'path-traversal-test',
            method: 'tools/call',
            params: { name: 'repo_file', arguments: { relpath: maliciousPath } }
          } as any)
          
          expect.fail(`Should reject path traversal attempt: ${maliciousPath}`)
        } catch (error) {
          expect(error).toBeInstanceOf(McpError)
          expect(error.code).toBe(ErrorCode.InvalidParams)
          expect(error.message).toContain('Path escapes repository root')
        }
      }
    })
  })

  describe('Performance and Resource Limits', () => {
    beforeEach(() => {
      process.env.CORTEX_MCP_TOKEN = 'test-token'
      process.env.CORTEX_MCP_ROOT = '/tmp/test-root'
    })

    it('should enforce 2MB payload limit for http_get', async () => {
      const server = new Server({
        name: 'cortex-mcp',
        version: '0.1.1'
      }, {
        capabilities: { tools: {} }
      })

      // Mock fetch to return large response
      const largeMockResponse = 'x'.repeat(3 * 1024 * 1024) // 3MB
      
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(largeMockResponse),
        headers: new Map([['content-type', 'text/plain']])
      }) as any

      try {
        await server.request({
          jsonrpc: '2.0',
          id: 'size-limit-test', 
          method: 'tools/call',
          params: { name: 'http_get', arguments: { url: 'https://example.com/large' } }
        } as any)
        
        expect.fail('Should reject response exceeding 2MB limit')
      } catch (error) {
        expect(error).toBeInstanceOf(McpError)
        expect(error.code).toBe(ErrorCode.InternalError)
        expect(error.message).toContain('exceeds')
        expect(error.message).toContain('bytes limit')
      }
    })

    it('should handle concurrent requests efficiently', async () => {
      const server = new Server({
        name: 'cortex-mcp',
        version: '0.1.1'
      }, {
        capabilities: { tools: {} }
      })

      const concurrentRequests = Array.from({ length: 50 }, (_, i) => ({
        jsonrpc: '2.0',
        id: `concurrent-${i}`,
        method: 'tools/call',
        params: { name: 'ping', arguments: { text: `Test ${i}` } }
      }))

      const startTime = Date.now()
      const responses = await Promise.all(
        concurrentRequests.map(req => server.request(req as any))
      )
      const endTime = Date.now()

      expect(responses).toHaveLength(50)
      expect(endTime - startTime).toBeLessThan(5000) // Should complete in <5 seconds
      
      // All responses should be successful
      for (const response of responses) {
        expect(response).toHaveProperty('result')
        expect(response.result.content[0].text).toContain('Pong!')
      }
    })

    it('should respond within performance thresholds', async () => {
      const server = new Server({
        name: 'cortex-mcp',
        version: '0.1.1'
      }, {
        capabilities: { tools: {} }
      })

      const performanceTests = [
        { method: 'tools/list', maxTime: 50 },
        { method: 'tools/call', params: { name: 'ping', arguments: {} }, maxTime: 100 }
      ]

      for (const test of performanceTests) {
        const startTime = Date.now()
        
        await server.request({
          jsonrpc: '2.0',
          id: 'perf-test',
          method: test.method,
          params: test.params || {}
        } as any)
        
        const endTime = Date.now()
        const duration = endTime - startTime
        
        expect(duration).toBeLessThan(test.maxTime)
      }
    })
  })

  describe('Error Handling and Edge Cases', () => {
    beforeEach(() => {
      process.env.CORTEX_MCP_TOKEN = 'test-token'
      process.env.CORTEX_MCP_ROOT = '/tmp/test-root'
    })

    it('should handle filesystem errors gracefully', async () => {
      const server = new Server({
        name: 'cortex-mcp',
        version: '0.1.1'
      }, {
        capabilities: { tools: {} }
      })

      // Mock fs.readFile to throw permission error
      vi.spyOn(fs, 'readFile').mockRejectedValue(new Error('EACCES: permission denied'))

      try {
        await server.request({
          jsonrpc: '2.0',
          id: 'fs-error-test',
          method: 'tools/call', 
          params: { name: 'repo_file', arguments: { relpath: 'test.txt' } }
        } as any)
        
        expect.fail('Should handle filesystem error')
      } catch (error) {
        expect(error).toBeInstanceOf(McpError)
        expect(error.code).toBe(ErrorCode.InternalError)
        expect(error.message).toContain('Failed to read file')
      }
    })

    it('should handle network errors for http_get', async () => {
      const server = new Server({
        name: 'cortex-mcp', 
        version: '0.1.1'
      }, {
        capabilities: { tools: {} }
      })

      // Mock fetch to reject with network error
      global.fetch = vi.fn().mockRejectedValue(new Error('Network timeout'))

      try {
        await server.request({
          jsonrpc: '2.0',
          id: 'network-error-test',
          method: 'tools/call',
          params: { name: 'http_get', arguments: { url: 'https://example.com/' } }
        } as any)
        
        expect.fail('Should handle network error')
      } catch (error) {
        expect(error).toBeInstanceOf(McpError)
        expect(error.code).toBe(ErrorCode.InternalError)
        expect(error.message).toContain('Fetch failed')
      }
    })

    it('should handle malformed tool arguments', async () => {
      const server = new Server({
        name: 'cortex-mcp',
        version: '0.1.1'
      }, {
        capabilities: { tools: {} }
      })

      const malformedCalls = [
        // Missing required argument
        { name: 'http_get', arguments: {} },
        // Wrong argument type
        { name: 'ping', arguments: { text: 123 } },
        // Invalid URL format
        { name: 'http_get', arguments: { url: 'not-a-url' } }
      ]

      for (const call of malformedCalls) {
        try {
          await server.request({
            jsonrpc: '2.0',
            id: 'malformed-args-test',
            method: 'tools/call',
            params: call
          } as any)
          
          expect.fail(`Should reject malformed call: ${JSON.stringify(call)}`)
        } catch (error) {
          expect(error).toBeInstanceOf(McpError)
          expect(error.code).toBeOneOf([
            ErrorCode.InvalidParams,
            ErrorCode.InternalError
          ])
        }
      }
    })
  })

  describe('Content Type Handling', () => {
    beforeEach(() => {
      process.env.CORTEX_MCP_TOKEN = 'test-token'
    })

    it('should handle JSON responses correctly', async () => {
      const server = new Server({
        name: 'cortex-mcp',
        version: '0.1.1'
      }, {
        capabilities: { tools: {} }
      })

      const mockJsonData = { key: 'value', number: 42 }
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockJsonData),
        headers: new Map([['content-type', 'application/json']])
      }) as any

      const response = await server.request({
        jsonrpc: '2.0',
        id: 'json-test',
        method: 'tools/call',
        params: { name: 'http_get', arguments: { url: 'https://example.com/api' } }
      } as any)

      expect(response.result.content[0].text).toBe(JSON.stringify(mockJsonData, null, 2))
    })

    it('should handle plain text responses correctly', async () => {
      const server = new Server({
        name: 'cortex-mcp',
        version: '0.1.1'
      }, {
        capabilities: { tools: {} }
      })

      const mockTextData = 'Plain text response content'
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(mockTextData),
        headers: new Map([['content-type', 'text/plain']])
      }) as any

      const response = await server.request({
        jsonrpc: '2.0',
        id: 'text-test',
        method: 'tools/call',
        params: { name: 'http_get', arguments: { url: 'https://example.com/text' } }
      } as any)

      expect(response.result.content[0].text).toBe(mockTextData)
    })

    it('should handle HTTP error status codes', async () => {
      const server = new Server({
        name: 'cortex-mcp',
        version: '0.1.1'
      }, {
        capabilities: { tools: {} }
      })

      const errorCases = [
        { status: 404, statusText: 'Not Found' },
        { status: 500, statusText: 'Internal Server Error' },
        { status: 403, statusText: 'Forbidden' }
      ]

      for (const errorCase of errorCases) {
        global.fetch = vi.fn().mockResolvedValue({
          ok: false,
          status: errorCase.status,
          statusText: errorCase.statusText
        }) as any

        try {
          await server.request({
            jsonrpc: '2.0',
            id: 'http-error-test',
            method: 'tools/call',
            params: { name: 'http_get', arguments: { url: 'https://example.com/error' } }
          } as any)
          
          expect.fail(`Should handle HTTP ${errorCase.status} error`)
        } catch (error) {
          expect(error).toBeInstanceOf(McpError)
          expect(error.code).toBe(ErrorCode.InternalError)
          expect(error.message).toContain(`HTTP ${errorCase.status}`)
        }
      }
    })
  })
})

/**
 * Integration Tests - Cross-tool workflows
 */
describe.skip('MCP Integration Tests', () => {
  let server: Server

  beforeEach(() => {
    process.env.CORTEX_MCP_TOKEN = 'test-token'
    process.env.CORTEX_MCP_ROOT = '/tmp/test-mcp-integration'
    
    server = new Server({
      name: 'cortex-mcp',
      version: '0.1.1'
    }, {
      capabilities: { tools: {} }
    })
  })

  it('should handle complete tool workflow', async () => {
    // 1. List available tools
    const toolsList = await server.request({
      jsonrpc: '2.0',
      id: 'workflow-1',
      method: 'tools/list'
    } as any)

    expect(toolsList.result.tools).toHaveLength(3)

    // 2. Test ping tool
    const pingResponse = await server.request({
      jsonrpc: '2.0', 
      id: 'workflow-2',
      method: 'tools/call',
      params: { name: 'ping', arguments: { text: 'Integration test' } }
    } as any)

    expect(pingResponse.result.content[0].text).toContain('Integration test')

    // 3. Test file operations (create test file first)
    await fs.mkdir('/tmp/test-mcp-integration', { recursive: true })
    await fs.writeFile('/tmp/test-mcp-integration/test.txt', 'Test file content')

    const fileResponse = await server.request({
      jsonrpc: '2.0',
      id: 'workflow-3', 
      method: 'tools/call',
      params: { name: 'repo_file', arguments: { relpath: 'test.txt' } }
    } as any)

    expect(fileResponse.result.content[0].text).toBe('Test file content')

    // Cleanup
    await fs.rm('/tmp/test-mcp-integration', { recursive: true, force: true })
  })
})

/**
 * CI Gates Configuration
 */
export const CI_GATES = {
  coverage: {
    statements: 90,
    branches: 90, 
    functions: 90,
    lines: 90
  },
  performance: {
    'tools/list': { p95: 50 }, // 50ms P95
    'tools/call': { p95: 100 } // 100ms P95
  },
  security: {
    authentication: 'required',
    path_traversal: 'blocked',
    resource_limits: 'enforced'
  }
}