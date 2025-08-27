# Structure Guard CI Workflow Test Plan

## Overview
This document outlines the test plan for integrating the enhanced structure guard into the CI workflow.

## Test Scenarios

### 1. Basic Validation
**Description**: Verify the structure guard runs successfully on a valid repository state
**Steps**:
1. Check out a known good branch
2. Run `pnpm structure:validate`
3. Verify exit code is 0
4. Verify no error output

**Expected Result**: Script completes successfully with exit code 0

### 2. Denied File Detection
**Description**: Verify detection of files matching denied patterns
**Setup**:
1. Create a file matching a denied pattern (e.g., `test.secret`)
2. Add file to repository

**Steps**:
1. Run `pnpm structure:validate`
2. Verify exit code is 4
3. Verify error message mentions denied file
4. Verify auto-fix suggestion is provided

**Expected Result**: Script exits with code 4 and provides clear error message

### 3. Disallowed Placement Detection
**Description**: Verify detection of files in unauthorized locations
**Setup**:
1. Create a file in an unauthorized location (e.g., `random/random.txt`)

**Steps**:
1. Run `pnpm structure:validate`
2. Verify exit code is 2
3. Verify error message mentions disallowed file
4. Verify auto-fix suggestion is provided

**Expected Result**: Script exits with code 2 and provides clear error message

### 4. Missing Protected File Detection
**Description**: Verify detection of missing required files
**Setup**:
1. Remove a protected file or directory

**Steps**:
1. Run `pnpm structure:validate`
2. Verify exit code is 3
3. Verify error message mentions missing protected file
4. Verify auto-fix suggestion is provided

**Expected Result**: Script exits with code 3 and provides clear error message

### 5. Package Structure Validation
**Description**: Verify detection of package structure violations
**Setup**:
1. Create a package missing required files
2. Or create a package with disallowed files

**Steps**:
1. Run `pnpm structure:validate`
2. Verify exit code is 5
3. Verify error message mentions package structure violations
4. Verify specific package and violations are identified

**Expected Result**: Script exits with code 5 and provides detailed error message

### 6. Root Entry Validation
**Description**: Verify detection of unauthorized root entries
**Setup**:
1. Create a file in repository root that's not in allowed list

**Steps**:
1. Run `pnpm structure:validate`
2. Verify exit code is 6
3. Verify error message mentions disallowed root entry
4. Verify auto-fix suggestion is provided

**Expected Result**: Script exits with code 6 and provides clear error message

## CI Integration Tests

### 1. GitHub Actions Workflow
**Description**: Verify integration with GitHub Actions
**Setup**:
1. Create a GitHub Actions workflow with structure validation step
2. Configure workflow to run on pull requests

**Steps**:
1. Create a pull request with a structure violation
2. Verify workflow runs and fails
3. Verify error details are visible in GitHub UI
4. Verify PR status is marked as failed

**Expected Result**: Workflow correctly identifies violations and blocks PR merge

### 2. Pre-commit Hook
**Description**: Verify integration with pre-commit hooks
**Setup**:
1. Install pre-commit hook for structure validation
2. Configure hook to run on commit

**Steps**:
1. Attempt to commit files with structure violations
2. Verify hook prevents commit
3. Verify error messages are displayed
4. Verify commit is blocked

**Expected Result**: Hook prevents commit and displays clear error messages

## Performance Tests

### 1. Large Repository Test
**Description**: Verify performance on large repositories
**Setup**:
1. Repository with 10,000+ files

**Steps**:
1. Run `pnpm structure:validate`
2. Measure execution time
3. Verify memory usage is reasonable
4. Verify results are accurate

**Expected Result**: Execution completes in under 30 seconds with reasonable memory usage

### 2. Pattern Matching Performance
**Description**: Verify performance of complex pattern matching
**Setup**:
1. Repository with complex nested directory structure
2. Files matching various complex patterns

**Steps**:
1. Run `pnpm structure:validate`
2. Measure pattern matching time
3. Verify all patterns are correctly matched
4. Verify no false positives/negatives

**Expected Result**: Pattern matching completes efficiently with accurate results

## Edge Case Tests

### 1. Unicode File Names
**Description**: Verify handling of Unicode file names
**Setup**:
1. Create files with Unicode characters in names

**Steps**:
1. Run `pnpm structure:validate`
2. Verify Unicode file names are handled correctly
3. Verify pattern matching works with Unicode

**Expected Result**: Unicode file names are handled correctly

### 2. Symbolic Links
**Description**: Verify handling of symbolic links
**Setup**:
1. Create symbolic links in repository

**Steps**:
1. Run `pnpm structure:validate`
2. Verify symbolic links are handled appropriately
3. Verify no errors or unexpected behavior

**Expected Result**: Symbolic links are handled correctly

### 3. Very Long Paths
**Description**: Verify handling of very long file paths
**Setup**:
1. Create files with very long paths (255+ characters)

**Steps**:
1. Run `pnpm structure:validate`
2. Verify long paths are handled correctly
3. Verify no buffer overflows or errors

**Expected Result**: Long paths are handled correctly

## Security Tests

### 1. Path Traversal Prevention
**Description**: Verify prevention of path traversal attacks
**Setup**:
1. Create files with path traversal patterns in names

**Steps**:
1. Run `pnpm structure:validate`
2. Verify path traversal attempts are handled safely
3. Verify no security vulnerabilities

**Expected Result**: Path traversal attempts are handled safely

### 2. Malformed Pattern Handling
**Description**: Verify handling of malformed glob patterns
**Setup**:
1. Configure policy with malformed glob patterns

**Steps**:
1. Run `pnpm structure:validate`
2. Verify malformed patterns are handled gracefully
3. Verify clear error messages are provided

**Expected Result**: Malformed patterns are handled gracefully with clear error messages

## Cross-platform Tests

### 1. Windows Compatibility
**Description**: Verify compatibility on Windows
**Setup**:
1. Run tests on Windows environment

**Steps**:
1. Run all validation tests on Windows
2. Verify path handling works correctly
3. Verify all functionality works as expected

**Expected Result**: All tests pass on Windows

### 2. macOS Compatibility
**Description**: Verify compatibility on macOS
**Setup**:
1. Run tests on macOS environment

**Steps**:
1. Run all validation tests on macOS
2. Verify path handling works correctly
3. Verify all functionality works as expected

**Expected Result**: All tests pass on macOS

### 3. Linux Compatibility
**Description**: Verify compatibility on Linux
**Setup**:
1. Run tests on Linux environment

**Steps**:
1. Run all validation tests on Linux
2. Verify path handling works correctly
3. Verify all functionality works as expected

**Expected Result**: All tests pass on Linux

## Rollback Tests

### 1. Policy Rollback
**Description**: Verify system works with previous policy versions
**Setup**:
1. Configure system with previous policy version

**Steps**:
1. Run `pnpm structure:validate`
2. Verify compatibility with previous policy
3. Verify no breaking changes

**Expected Result**: System works correctly with previous policy versions

## Monitoring Tests

### 1. Performance Monitoring
**Description**: Verify performance metrics are collected
**Setup**:
1. Enable performance monitoring

**Steps**:
1. Run validation multiple times
2. Collect performance metrics
3. Verify metrics are accurate

**Expected Result**: Accurate performance metrics are collected

### 2. Violation Tracking
**Description**: Verify violation tracking works
**Setup**:
1. Enable violation tracking

**Steps**:
1. Introduce various violations
2. Run validation
3. Verify violations are tracked
4. Verify metrics are collected

**Expected Result**: Violations are properly tracked with metrics

## Success Criteria

All tests must pass with:
- Correct exit codes
- Clear error messages
- No false positives
- No false negatives
- Reasonable performance
- Cross-platform compatibility
- Security compliance

## Test Execution Schedule

### Pre-deployment
- All basic validation tests
- All security tests
- Cross-platform compatibility tests

### Post-deployment
- CI integration tests
- Performance tests
- Monitoring tests

### Ongoing
- Edge case tests (monthly)
- Security tests (quarterly)
- Performance tests (quarterly)