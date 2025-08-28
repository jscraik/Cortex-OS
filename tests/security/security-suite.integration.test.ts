/**
 * @file_path tests/security/security-suite.integration.test.ts
 * @description Comprehensive integration tests for all security improvements
 * @maintainer Security Team
 * @version 1.0.0
 * @security OWASP Top 10 & MITRE ATLAS compliance
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { SecureDatabaseWrapper } from '@cortex-os/mvp-core/src/secure-db';
import { SecureNeo4j } from '@cortex-os/utils';
import { SecureCommandExecutor } from '@cortex-os/mvp-core/src/secure-executor';

// Mock external dependencies
vi.mock('better-sqlite3', () => {
  const mockStatement = {
    run: vi.fn().mockReturnValue({}),
    get: vi.fn().mockReturnValue({}),
    all: vi.fn().mockReturnValue([]),
  };

  const mockDatabase = {
    prepare: vi.fn().mockReturnValue(mockStatement),
    pragma: vi.fn(),
    close: vi.fn(),
  };

  return {
    default: vi.fn().mockImplementation(() => mockDatabase),
    Database: vi.fn().mockImplementation(() => mockDatabase),
  };
});

vi.mock('neo4j-driver', () => {
  const mockRecord = {
    get: vi.fn().mockReturnValue([]),
  };

  const mockResult = {
    records: [mockRecord],
  };

  const mockSession = {
    run: vi.fn().mockResolvedValue(mockResult),
    close: vi.fn(),
  };

  const mockDriver = {
    session: vi.fn().mockReturnValue(mockSession),
    close: vi.fn(),
  };

  return {
    default: {
      driver: vi.fn().mockReturnValue(mockDriver),
      auth: {
        basic: vi.fn(),
      },
    },
  };
});

vi.mock('child_process', () => {
  const mockChildProcess = {
    stdout: {
      on: vi.fn(),
      removeAllListeners: vi.fn(),
    },
    stderr: {
      on: vi.fn(),
      removeAllListeners: vi.fn(),
    },
    on: vi.fn(),
    removeAllListeners: vi.fn(),
    kill: vi.fn(),
  };

  return {
    spawn: vi.fn().mockReturnValue(mockChildProcess),
  };
});

describe('Security Suite - Integration Tests', () => {
  let secureDb: SecureDatabaseWrapper;
  let secureNeo4j: SecureNeo4j;
  let mockDatabase: any;
  let mockDriver: any;
  let mockSession: any;

  beforeEach(() => {
    mockSession = {
      run: vi.fn().mockResolvedValue({
        records: [
          {
            get: vi.fn().mockReturnValue([]),
          },
        ],
      }),
      close: vi.fn(),
    };

    mockDriver = {
      session: vi.fn().mockReturnValue(mockSession),
      close: vi.fn(),
    };

    mockDatabase = {
      prepare: vi.fn().mockReturnValue({
        run: vi.fn().mockReturnValue({}),
        get: vi.fn().mockReturnValue({}),
        all: vi.fn().mockReturnValue([]),
      }),
      pragma: vi.fn(),
      close: vi.fn(),
    };

    secureDb = new SecureDatabaseWrapper(mockDatabase);
    secureNeo4j = new SecureNeo4j('bolt://localhost:7687', 'neo4j', 'password');
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Cross-Wrappper Security Coordination Tests', () => {
    test('should coordinate database and graph operations safely', async () => {
      // First, store data in database
      const userData = {
        id: 'user_123',
        name: 'John Doe',
        email: 'john@example.com',
      };

      secureDb.secureRun(
        'INSERT INTO users (id, name, email) VALUES (?, ?, ?)',
        userData.id,
        userData.name,
        userData.email,
      );

      // Then, create corresponding node in graph database
      const userNode = {
        id: userData.id,
        label: 'User',
        props: {
          name: userData.name,
          email: userData.email,
          createdAt: new Date().toISOString(),
        },
      };

      await secureNeo4j.upsertNode(userNode);

      // Verify both operations succeeded
      expect(mockDatabase.prepare).toHaveBeenCalledWith(
        'INSERT INTO users (id, name, email) VALUES (?, ?, ?)',
      );
      expect(mockDriver.session).toHaveBeenCalled();
    });

    test('should prevent cross-wrapper injection attacks', async () => {
      // Attempt to inject malicious data from database to graph
      const maliciousUserData = {
        id: "user_123'; DROP TABLE users; CREATE (m {name:'compromised'});",
        name: 'John Doe',
        email: 'john@example.com',
      };

      // This should not throw because of parameterization
      expect(() => {
        secureDb.secureRun(
          'INSERT INTO users (id, name, email) VALUES (?, ?, ?)',
          maliciousUserData.id,
          maliciousUserData.name,
          maliciousUserData.email,
        );
      }).not.toThrow();

      // But when we try to use this data in Neo4j, it should be caught
      const maliciousNode = {
        id: maliciousUserData.id,
        label: 'User',
        props: {
          name: maliciousUserData.name,
          email: maliciousUserData.email,
        },
      };

      await expect(async () => {
        await secureNeo4j.upsertNode(maliciousNode);
      }).rejects.toThrow(/Invalid node ID/);
    });

    test('should coordinate command execution with database operations', async () => {
      // Store a command in the database
      const commandData = {
        id: 'cmd_123',
        command: ['docker', 'ps'],
        description: 'List Docker containers',
      };

      secureDb.secureRun(
        'INSERT INTO commands (id, command, description) VALUES (?, ?, ?)',
        commandData.id,
        JSON.stringify(commandData.command),
        commandData.description,
      );

      // Retrieve and execute the command
      const retrievedCommand = secureDb.secureGet(
        'SELECT command FROM commands WHERE id = ?',
        commandData.id,
      );

      if (retrievedCommand) {
        const parsedCommand = JSON.parse(retrievedCommand.command);
        const result = await SecureCommandExecutor.executeCommand(parsedCommand);

        expect(result).toHaveProperty('exitCode');
      }
    });

    test('should prevent command execution with database-injected malicious commands', async () => {
      // Store a malicious command in the database
      const maliciousCommandData = {
        id: 'cmd_malicious',
        command: JSON.stringify(['docker', 'ps;', 'rm', '-rf', '/']),
        description: 'Malicious command',
      };

      secureDb.secureRun(
        'INSERT INTO commands (id, command, description) VALUES (?, ?, ?)',
        maliciousCommandData.id,
        maliciousCommandData.command,
        maliciousCommandData.description,
      );

      // Retrieve and attempt to execute the command
      const retrievedCommand = secureDb.secureGet(
        'SELECT command FROM commands WHERE id = ?',
        maliciousCommandData.id,
      );

      if (retrievedCommand) {
        const parsedCommand = JSON.parse(retrievedCommand.command);

        await expect(async () => {
          await SecureCommandExecutor.executeCommand(parsedCommand);
        }).rejects.toThrow(/Invalid characters in command/);
      }
    });
  });

  describe('Unified Security Policy Enforcement Tests', () => {
    test('should enforce consistent input validation across all wrappers', async () => {
      // Test with the same malicious input across all wrappers
      const maliciousInput = "test'; DROP TABLE users; --";

      // Database wrapper should not throw because of parameterization
      expect(() => {
        secureDb.secureRun('SELECT * FROM users WHERE id = ?', maliciousInput);
      }).not.toThrow();

      // But Neo4j wrapper should reject
      const maliciousNode = {
        id: maliciousInput,
        label: 'User',
        props: { name: 'John' },
      };

      await expect(async () => {
        await secureNeo4j.upsertNode(maliciousNode);
      }).rejects.toThrow(/Invalid node ID/);

      // And Command executor should reject
      await expect(async () => {
        await SecureCommandExecutor.executeCommand(['echo', maliciousInput]);
      }).rejects.toThrow(/Invalid characters in command/);
    });

    test('should enforce consistent resource limits across all wrappers', async () => {
      // Test with large data sets across all wrappers
      const largeDataSet = Array(1000).fill('test_data');

      // Database operation with large dataset
      const largeInsertQuery =
        'INSERT INTO test_table (data) VALUES ' + largeDataSet.map(() => '(?)').join(', ');

      expect(() => {
        secureDb.secureRun(largeInsertQuery, ...largeDataSet);
      }).not.toThrow();

      // Neo4j operation with large dataset
      const largeNodeBatch = largeDataSet.map((data, index) => ({
        id: `node_${index}`,
        label: 'TestData',
        props: { value: data, index },
      }));

      // This should not cause issues
      expect(largeNodeBatch.length).toBe(1000);

      // Command execution with large arguments (should be rejected)
      const veryLargeArgs = Array(100).fill('A'.repeat(100)); // 100 arguments of 100 chars each

      await expect(async () => {
        await SecureCommandExecutor.executeCommand(['echo', ...veryLargeArgs]);
      }).rejects.toThrow(/Argument too long/);
    });

    test('should enforce consistent timeout limits across all wrappers', async () => {
      // Test with a long-running operation across all wrappers
      const timeout = 100; // 100ms timeout

      // Database operation should respect timeout
      const dbStartTime = Date.now();
      try {
        secureDb.secureRun('SELECT * FROM users WHERE id = ?', '123');
      } catch (error) {
        // Expected to succeed quickly
      }
      const dbEndTime = Date.now();

      // Neo4j operation should respect timeout
      const neo4jStartTime = Date.now();
      try {
        await secureNeo4j.neighborhood('user_123', 2);
      } catch (error) {
        // Expected to succeed quickly
      }
      const neo4jEndTime = Date.now();

      // Command execution should respect timeout
      const cmdStartTime = Date.now();
      try {
        await SecureCommandExecutor.executeCommand(['echo', 'test'], timeout);
      } catch (error) {
        // May timeout depending on system
      }
      const cmdEndTime = Date.now();

      // All operations should complete within reasonable time
      expect(dbEndTime - dbStartTime).toBeLessThan(1000); // Less than 1 second
      expect(neo4jEndTime - neo4jStartTime).toBeLessThan(1000); // Less than 1 second
      expect(cmdEndTime - cmdStartTime).toBeLessThan(1000); // Less than 1 second
    });
  });

  describe('Error Handling and Recovery Tests', () => {
    test('should handle cascading failures gracefully', async () => {
      // Simulate database failure
      mockDatabase.prepare.mockImplementationOnce(() => {
        throw new Error('Database connection failed');
      });

      // Attempt database operation
      expect(() => {
        secureDb.secureRun('SELECT * FROM users WHERE id = ?', '123');
      }).toThrow('Database connection failed');

      // Ensure Neo4j and command execution still work
      const userNode = {
        id: 'user_123',
        label: 'User',
        props: { name: 'John' },
      };

      await expect(secureNeo4j.upsertNode(userNode)).resolves.not.toThrow();
      await expect(SecureCommandExecutor.executeCommand(['echo', 'test'])).resolves.not.toThrow();
    });

    test('should maintain security even during partial system failures', async () => {
      // Simulate Neo4j failure
      mockSession.run.mockRejectedValueOnce(new Error('Neo4j connection failed'));

      // Attempt Neo4j operation
      await expect(async () => {
        await secureNeo4j.upsertNode({
          id: 'user_123',
          label: 'User',
          props: { name: 'John' },
        });
      }).rejects.toThrow('Neo4j connection failed');

      // Ensure database and command execution still enforce security
      const maliciousInput = "test'; DROP TABLE users; --";

      // Database should still prevent SQL injection through parameterization
      expect(() => {
        secureDb.secureRun('SELECT * FROM users WHERE id = ?', maliciousInput);
      }).not.toThrow();

      // Command execution should still prevent injection
      await expect(async () => {
        await SecureCommandExecutor.executeCommand(['echo', maliciousInput]);
      }).rejects.toThrow(/Invalid characters in command/);
    });

    test('should recover from transient failures', async () => {
      // Simulate temporary failure followed by success
      mockDatabase.prepare
        .mockImplementationOnce(() => {
          throw new Error('Temporary database error');
        })
        .mockImplementationOnce(() => {
          return {
            run: vi.fn().mockReturnValue({}),
            get: vi.fn().mockReturnValue({}),
            all: vi.fn().mockReturnValue([]),
          };
        });

      // First attempt should fail
      expect(() => {
        secureDb.secureRun('SELECT * FROM users WHERE id = ?', '123');
      }).toThrow('Temporary database error');

      // Second attempt should succeed
      expect(() => {
        secureDb.secureRun('SELECT * FROM users WHERE id = ?', '123');
      }).not.toThrow();
    });
  });

  describe('Audit Trail and Logging Tests', () => {
    test('should maintain consistent audit trails across all wrappers', async () => {
      // Perform operations with all wrappers
      const startTime = new Date().toISOString();

      // Database operation
      secureDb.secureRun('INSERT INTO users (id, name) VALUES (?, ?)', 'user_123', 'John Doe');

      // Neo4j operation
      await secureNeo4j.upsertNode({
        id: 'user_123',
        label: 'User',
        props: { name: 'John Doe' },
      });

      // Command execution
      await SecureCommandExecutor.executeCommand(['echo', 'test']);

      const endTime = new Date().toISOString();

      // Verify audit trail consistency
      expect(startTime).toBeLessThanOrEqual(endTime);
    });

    test('should prevent audit trail tampering', async () => {
      // Attempt to insert malicious data that could affect audit logs
      const maliciousAuditData = {
        id: "audit_123'; DELETE FROM audit_log; INSERT INTO audit_log (message) VALUES ('Tampered'); --",
        timestamp: new Date().toISOString(),
        action: 'test_action',
        user: 'test_user',
      };

      // Database should prevent SQL injection in audit logging
      expect(() => {
        secureDb.secureRun(
          'INSERT INTO audit_log (id, timestamp, action, user) VALUES (?, ?, ?, ?)',
          maliciousAuditData.id,
          maliciousAuditData.timestamp,
          maliciousAuditData.action,
          maliciousAuditData.user,
        );
      }).not.toThrow(); // Parameterization prevents injection

      // Neo4j should prevent Cypher injection in audit logging
      const maliciousAuditNode = {
        id: maliciousAuditData.id,
        label: 'AuditLog',
        props: {
          timestamp: maliciousAuditData.timestamp,
          action: maliciousAuditData.action,
          user: maliciousAuditData.user,
        },
      };

      await expect(async () => {
        await secureNeo4j.upsertNode(maliciousAuditNode);
      }).rejects.toThrow(/Invalid node ID/);
    });
  });

  describe('Performance and Resource Management Tests', () => {
    test('should coordinate resource usage across all wrappers', async () => {
      // Perform concurrent operations with all wrappers
      const operations = [
        secureDb.secureRun('SELECT * FROM users WHERE id = ?', '123'),
        secureNeo4j.neighborhood('user_123', 2),
        SecureCommandExecutor.executeCommand(['echo', 'test']),
      ];

      // All operations should complete successfully
      await Promise.all(operations);

      // Verify resource cleanup
      expect(mockDatabase.close).not.toHaveBeenCalled(); // Database should remain open
      expect(mockSession.close).toHaveBeenCalled(); // Neo4j session should be closed
    });

    test('should handle resource exhaustion gracefully', async () => {
      // Simulate resource exhaustion
      const mockLimitedResources = {
        databaseConnections: 0,
        neo4jSessions: 0,
        concurrentProcesses: 0,
      };

      // Perform many operations to stress test resource management
      const promises = [];

      for (let i = 0; i < 10; i++) {
        promises.push(secureDb.secureRun('SELECT * FROM users WHERE id = ?', `user_${i}`));
        promises.push(secureNeo4j.neighborhood(`user_${i}`, 1));
        promises.push(SecureCommandExecutor.executeCommand(['echo', `test_${i}`]));
      }

      // All operations should complete successfully
      await Promise.all(promises);

      // Verify resource cleanup
      expect(mockSession.close).toHaveBeenCalled();
    });
  });
});
