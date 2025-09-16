# A2A HTTP Transport Test Plan

## Overview

This document outlines the test plan for verifying the HTTP transport implementation for native A2A communication.

## Test Scenarios

### Scenario 1: Basic HTTP Publishing and Subscription

**Objective**: Verify that messages can be published and received over HTTP transport

**Setup**:
1. Start HTTP server for message reception
2. Create A2A bus with HTTP transport
3. Subscribe to a message type
4. Publish a message to that type

**Expected Results**:
- Message is successfully published
- Message is received by subscriber
- Message content is intact
- No errors occur during transmission

### Scenario 2: HTTP Transport with Schema Validation

**Objective**: Verify that schema validation works with HTTP transport

**Setup**:
1. Create schema registry with message schema
2. Create A2A bus with HTTP transport and schema registry
3. Subscribe to a message type
4. Publish a valid message
5. Publish an invalid message

**Expected Results**:
- Valid message is successfully published and received
- Invalid message is rejected with validation error
- Error message contains appropriate validation details

### Scenario 3: HTTP Transport with Security ACLs

**Objective**: Verify that security ACLs work with HTTP transport

**Setup**:
1. Create ACL configuration allowing/denying specific topics
2. Create A2A bus with HTTP transport and ACL
3. Attempt to publish to allowed topic
4. Attempt to publish to denied topic
5. Attempt to subscribe to allowed topic
6. Attempt to subscribe to denied topic

**Expected Results**:
- Allowed publish/subscribe operations succeed
- Denied publish/subscribe operations fail with appropriate errors
- Error messages indicate permission denied

### Scenario 4: HTTP Transport Error Handling

**Objective**: Verify that error handling works correctly with HTTP transport

**Setup**:
1. Create A2A bus with HTTP transport
2. Configure HTTP server to return various error codes
3. Attempt to publish messages
4. Verify error handling behavior

**Expected Results**:
- Network errors are handled gracefully
- HTTP error codes are properly interpreted
- Retry logic works as expected
- Error messages are logged appropriately

## Test Implementation Plan

### Test 1: Basic HTTP Transport Test

```typescript
// TODO: Implement once HTTP transport is available
async function testBasicHttpTransport() {
  // 1. Start HTTP server
  // 2. Create A2A bus with HTTP transport
  // 3. Subscribe to message type
  // 4. Publish message
  // 5. Verify receipt
}
```

### Test 2: Schema Validation Test

```typescript
// TODO: Implement once HTTP transport is available
async function testHttpTransportSchemaValidation() {
  // 1. Create schema registry
  // 2. Create A2A bus with HTTP transport and schema registry
  // 3. Subscribe to message type
  // 4. Publish valid message
  // 5. Publish invalid message
  // 6. Verify results
}
```

### Test 3: Security ACL Test

```typescript
// TODO: Implement once HTTP transport is available
async function testHttpTransportSecurity() {
  // 1. Create ACL configuration
  // 2. Create A2A bus with HTTP transport and ACL
  // 3. Test allowed operations
  // 4. Test denied operations
  // 5. Verify results
}
```

### Test 4: Error Handling Test

```typescript
// TODO: Implement once HTTP transport is available
async function testHttpTransportErrorHandling() {
  // 1. Configure HTTP server with error responses
  // 2. Create A2A bus with HTTP transport
  // 3. Attempt operations
  // 4. Verify error handling
}
```

## Test Data

### Message Schema
```json
{
  "type": "test.message.v1",
  "data": {
    "id": "string",
    "timestamp": "ISO8601 datetime",
    "content": "string"
  }
}
```

### Valid Message Example
```json
{
  "id": "msg-001",
  "timestamp": "2025-09-16T10:00:00Z",
  "content": "Test message content"
}
```

### Invalid Message Example
```json
{
  "id": "msg-002",
  "timestamp": "invalid-date",
  "content": "Test message content"
}
```

## Expected Error Conditions

1. **Network Errors**
   - Connection refused
   - Timeout
   - DNS resolution failure

2. **HTTP Errors**
   - 400 Bad Request
   - 401 Unauthorized
   - 403 Forbidden
   - 404 Not Found
   - 500 Internal Server Error
   - 503 Service Unavailable

3. **Validation Errors**
   - Schema validation failures
   - Message format errors
   - Required field missing

4. **Security Errors**
   - Permission denied
   - Authentication required
   - Invalid credentials

## Success Criteria

1. All test scenarios pass
2. Error conditions are handled appropriately
3. Performance is within acceptable limits
4. Logs contain appropriate information for debugging
5. No memory leaks or resource leaks
6. All edge cases are handled correctly

## Test Execution

This test plan will be executed once the HTTP transport implementation is complete.