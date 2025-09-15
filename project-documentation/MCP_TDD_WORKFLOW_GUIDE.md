# MCP TDD Workflow Guide

## Overview

This document provides a standardized Test-Driven Development workflow for implementing Model Context Protocol (MCP) integrations across all Cortex-OS apps and packages. Following this workflow ensures consistent quality, security, and performance across all MCP implementations.

## TDD Workflow Phases

### Phase 1: Requirements Analysis

Before writing any code, thoroughly analyze the requirements for the MCP integration:

1. **Identify Core Functionality**
   - What operations need to be exposed via MCP?
   - What are the input parameters for each operation?
   - What are the expected outputs?
   - What error conditions need to be handled?

1. **Define Tool Contracts**
   - Create JSON Schema definitions for inputs
   - Define expected output structures
   - Specify error response formats
   - Document security requirements

1. **Select Implementation Language**
   - Python for ML/data-intensive operations
   - TypeScript for web/backend services
   - Rust for performance-critical components

### Phase 2: Test Design

Design comprehensive tests before implementation:

1. **Unit Test Planning**
   - Plan tests for each MCP tool function
   - Identify edge cases and error scenarios
   - Define test data and expected outcomes
   - Consider performance test scenarios

1. **Integration Test Planning**
   - Plan end-to-end tests with MCP clients
   - Identify cross-package integration points
   - Define test environments and dependencies
   - Plan security and performance validation tests

1. **Contract Test Planning**
   - Define schema validation tests
   - Plan version compatibility tests
   - Identify breaking change scenarios
   - Create test data for all supported formats

### Phase 3: Red Phase (Failing Tests)

Write tests that initially fail to validate the testing approach:

1. **Write Unit Tests**

   ```python
   # Example for Python MCP tool
   def test_memory_get_tool():
       # Arrange
       tool = MemoryGetTool()
       # Act & Assert
       with pytest.raises(ValidationError):
           tool.execute({"key": None})
   ```

1. **Write Integration Tests**

   ```typescript
   // Example for TypeScript MCP tool
   test('should fail with invalid input', async () => {
     const tool = new MemoryGetTool();
     await expect(tool.execute({key: null}))
       .rejects.toThrow(ValidationError);
   });
   ```

1. **Write Contract Tests**

   ```rust
   // Example for Rust MCP tool
   #[test]
   fn test_input_validation() {
       let tool = MemoryGetTool::new();
       let invalid_input = json!({"key": null});
       assert!(tool.validate_input(&invalid_input).is_err());
   }
   ```

### Phase 4: Green Phase (Minimal Implementation)

Implement the minimal code required to pass the tests:

1. **Create Tool Skeleton**
   - Define tool interface/structure
   - Implement basic input validation
   - Add placeholder return values
   - Ensure tests can compile and run

1. **Pass Unit Tests**
   - Implement core functionality
   - Handle basic error cases
   - Return expected data structures
   - Validate all unit tests pass

1. **Pass Integration Tests**
   - Implement MCP protocol compliance
   - Handle cross-package communication
   - Validate integration test scenarios
   - Ensure proper error propagation

### Phase 5: Refactor Phase

Improve the implementation while keeping tests passing:

1. **Code Quality Improvements**
   - Optimize performance
   - Improve error handling
   - Enhance security measures
   - Refactor for maintainability

1. **Security Enhancements**
   - Implement sandboxing policies
   - Add access control checks
   - Validate input sanitization
   - Ensure data privacy compliance

1. **Performance Optimizations**
   - Profile and optimize slow operations
   - Implement caching where appropriate
   - Reduce memory allocations
   - Optimize network communication

### Phase 6: Documentation

Create comprehensive documentation for the MCP implementation:

1. **API Documentation**
   - Document all tool interfaces
   - Provide usage examples
   - Explain error codes and responses
   - Include security considerations

1. **Integration Guides**
   - Provide setup instructions
   - Document configuration options
   - Include troubleshooting guides
   - Create migration guides if applicable

1. **Testing Documentation**
   - Document test coverage
   - Explain how to run tests
   - Provide performance benchmarks
   - Include security testing procedures

## Language-Specific Guidelines

### Python MCP Implementation

1. **Use Pydantic for Validation**

   ```python
   from pydantic import BaseModel, Field
   from typing import Optional
   
   class MemoryGetInput(BaseModel):
       key: str = Field(..., min_length=1, max_length=1000)
       namespace: Optional[str] = Field(None, max_length=100)
   ```

1. **Implement Async Operations**

   ```python
   async def execute(self, input_data: dict) -> dict:
       validated_input = MemoryGetInput(**input_data)
       # Implementation here
       return result
   ```

1. **Handle Errors Gracefully**

   ```python
   from fastapi import HTTPException
   
   try:
       # Operation
   except ValidationError as e:
       raise HTTPException(status_code=400, detail=str(e))
   except Exception as e:
       raise HTTPException(status_code=500, detail="Internal error")
   ```

### TypeScript MCP Implementation

1. **Use Zod for Validation**

   ```typescript
   import { z } from 'zod';
   
   const MemoryGetInputSchema = z.object({
     key: z.string().min(1).max(1000),
     namespace: z.string().max(100).optional(),
   });
   ```

1. **Implement Type Safety**

   ```typescript
   interface MemoryGetInput {
     key: string;
     namespace?: string;
   }
   
   async execute(input: MemoryGetInput): Promise<MemoryGetResult> {
     const validatedInput = MemoryGetInputSchema.parse(input);
     // Implementation here
     return result;
   }
   ```

1. **Use Proper Error Handling**

   ```typescript
   try {
     // Operation
   } catch (error) {
     if (error instanceof z.ZodError) {
       throw new ValidationError(error.message);
     }
     throw new InternalError('Operation failed');
   }
   ```

### Rust MCP Implementation

1. **Use Serde for Serialization**

   ```rust
   use serde::{Deserialize, Serialize};
   
   #[derive(Deserialize, Serialize)]
   struct MemoryGetInput {
       key: String,
       #[serde(skip_serializing_if = "Option::is_none")]
       namespace: Option<String>,
   }
   ```

2. **Implement Error Handling**

   ```rust
   use thiserror::Error;
   
   #[derive(Error, Debug)]
   pub enum MemoryError {
       #[error("Validation error: {0}")]
       ValidationError(String),
       #[error("Internal error: {0}")]
       InternalError(String),
   }
   ```

3. **Use Async/Await Pattern**

   ```rust
   impl MemoryGetTool {
       async fn execute(&self, input: Value) -> Result<Value, MemoryError> {
           let validated_input: MemoryGetInput = serde_json::from_value(input)
               .map_err(|e| MemoryError::ValidationError(e.to_string()))?;
           // Implementation here
           Ok(result)
       }
   }
   ```

## Quality Gates

### Before Merging

1. **Code Review**
   - [ ] All code reviewed by at least one peer
   - [ ] Security considerations addressed
   - [ ] Performance implications evaluated
   - [ ] Documentation completeness verified

2. **Testing Requirements**
   - [ ] Unit test coverage >= 90%
   - [ ] Integration tests pass
   - [ ] Contract tests pass
   - [ ] Security tests pass
   - [ ] Performance tests pass

3. **Documentation Requirements**
   - [ ] API documentation complete
   - [ ] Usage examples provided
   - [ ] Error handling documented
   - [ ] Security considerations documented

### Continuous Integration

1. **Automated Testing**
   - Run all unit tests on every commit
   - Run integration tests on pull requests
   - Run contract tests weekly
   - Run security scans daily

2. **Quality Metrics**
   - Monitor test coverage
   - Track performance benchmarks
   - Monitor error rates
   - Track security vulnerabilities

## Common Pitfalls and Solutions

### Pitfall 1: Insufficient Input Validation

**Problem**: Tools accept malformed input leading to errors or security issues
**Solution**: Use schema validation libraries and validate all inputs

### Pitfall 2: Poor Error Handling

**Problem**: Generic error messages that don't help users
**Solution**: Provide specific, actionable error messages

### Pitfall 3: Performance Bottlenecks

**Problem**: Slow MCP tools affect overall system performance
**Solution**: Profile tools and optimize critical paths

### Pitfall 4: Security Vulnerabilities

**Problem**: Tools expose sensitive data or allow unauthorized access
**Solution**: Implement proper sandboxing and access controls

### Pitfall 5: Inadequate Documentation

**Problem**: Users struggle to understand how to use MCP tools
**Solution**: Provide comprehensive documentation with examples

## Best Practices

### Design Principles

1. **Keep Tools Focused**: Each tool should have a single, well-defined purpose
2. **Fail Fast**: Validate inputs early and provide clear error messages
3. **Be Consistent**: Follow established patterns and conventions
4. **Secure by Default**: Implement security measures from the start
5. **Observable**: Provide logging and metrics for monitoring

### Implementation Patterns

1. **Input Validation First**: Always validate inputs before processing
2. **Async Operations**: Use async patterns for I/O bound operations
3. **Resource Management**: Properly manage connections and resources
4. **Error Propagation**: Propagate errors with context information
5. **Logging**: Provide appropriate logging for debugging and monitoring

### Testing Patterns

1. **Test Edge Cases**: Include tests for boundary conditions
2. **Test Error Scenarios**: Validate error handling paths
3. **Test Performance**: Include performance benchmarks
4. **Test Security**: Include security validation tests
5. **Test Integration**: Validate cross-component interactions

This workflow ensures that all MCP implementations follow consistent practices while maintaining high quality, security, and performance standards.
