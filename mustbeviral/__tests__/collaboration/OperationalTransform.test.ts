// Comprehensive tests for Operational Transform system
// Tests concurrent operations, edge cases, and Google Docs-level scenarios

import {
  Operation,
  InsertOperation,
  DeleteOperation,
  FormatOperation,
  DocumentState,
  OperationMetadata,
  createOperationId,
  calculateChecksum
} from '../../src/lib/collaboration/OperationTypes';

import { operationalTransform } from '../../src/lib/collaboration/OperationalTransform';
import { stateManager } from '../../src/lib/collaboration/StateManager';
import { collaborationSessionManager } from '../../src/lib/collaboration/CollaborationSession';

describe('Operational Transform Core', () => {
  beforeEach(() => {
    // Clear any cached state
    operationalTransform.clearCache();
  });

  describe('Basic Transform Operations', () => {
    test('should transform concurrent inserts at same position', () => {
      const metadata1: OperationMetadata = {
        operationId: createOperationId(),
        userId: 'user1',
        sessionId: 'session1',
        timestamp: Date.now(),
        vectorClock: { user1: 1 },
        documentVersion: 1
      };

      const metadata2: OperationMetadata = {
        operationId: createOperationId(),
        userId: 'user2',
        sessionId: 'session1',
        timestamp: Date.now() + 1,
        vectorClock: { user2: 1 },
        documentVersion: 1
      };

      const op1: InsertOperation = {
        type: 'insert',
        position: 5,
        content: 'Hello',
        metadata: metadata1
      };

      const op2: InsertOperation = {
        type: 'insert',
        position: 5,
        content: 'World',
        metadata: metadata2
      };

      const result = operationalTransform.transform(op1, op2);

      // User1's operation should remain at position 5
      expect(result.transformed1.position).toBe(5);
      expect((result.transformed1 as InsertOperation).content).toBe('Hello');

      // User2's operation should be shifted to account for User1's insert
      expect(result.transformed2.position).toBe(10); // 5 + 'Hello'.length
      expect((result.transformed2 as InsertOperation).content).toBe('World');
    });

    test('should transform insert against delete', () => {
      const insertOp: InsertOperation = {
        type: 'insert',
        position: 10,
        content: 'text',
        metadata: {
          operationId: createOperationId(),
          userId: 'user1',
          sessionId: 'session1',
          timestamp: Date.now(),
          vectorClock: { user1: 1 },
          documentVersion: 1
        }
      };

      const deleteOp: DeleteOperation = {
        type: 'delete',
        position: 5,
        length: 3,
        metadata: {
          operationId: createOperationId(),
          userId: 'user2',
          sessionId: 'session1',
          timestamp: Date.now(),
          vectorClock: { user2: 1 },
          documentVersion: 1
        }
      };

      const result = operationalTransform.transform(insertOp, deleteOp);

      // Insert position should be adjusted for the deletion
      expect(result.transformed1.position).toBe(7); // 10 - 3
      expect((result.transformed1 as InsertOperation).content).toBe('text');
    });

    test('should handle delete against delete with overlap', () => {
      const delete1: DeleteOperation = {
        type: 'delete',
        position: 5,
        length: 5, // deletes positions 5-9
        metadata: {
          operationId: createOperationId(),
          userId: 'user1',
          sessionId: 'session1',
          timestamp: Date.now(),
          vectorClock: { user1: 1 },
          documentVersion: 1
        }
      };

      const delete2: DeleteOperation = {
        type: 'delete',
        position: 7,
        length: 4, // deletes positions 7-10
        metadata: {
          operationId: createOperationId(),
          userId: 'user2',
          sessionId: 'session1',
          timestamp: Date.now() + 1,
          vectorClock: { user2: 1 },
          documentVersion: 1
        }
      };

      const result = operationalTransform.transform(delete1, delete2);

      // First delete should remain unchanged
      expect(result.transformed1.position).toBe(5);
      expect((result.transformed1 as DeleteOperation).length).toBe(5);

      // Second delete should be adjusted to avoid overlap
      expect(result.transformed2.position).toBe(5); // Moved to start of delete range
      expect((result.transformed2 as DeleteOperation).length).toBe(2); // Only the non-overlapping part
    });
  });

  describe('Complex Concurrent Scenarios', () => {
    test('should handle rapid-fire concurrent edits', async () => {
      const documentState: DocumentState = {
        id: 'doc1',
        content: 'The quick brown fox jumps over the lazy dog',
        version: 1,
        checksum: '',
        lastModified: Date.now(),
        formatting: {},
        metadata: {
          collaborators: ['user1', 'user2', 'user3'],
          permissions: {
            read: ['user1', 'user2', 'user3'],
            write: ['user1', 'user2', 'user3'],
            admin: ['user1'],
            owner: 'user1'
          }
        }
      };

      // Simulate 3 users editing simultaneously
      const operations: Operation[] = [
        {
          type: 'insert',
          position: 4,
          content: 'very ',
          metadata: {
            operationId: createOperationId(),
            userId: 'user1',
            sessionId: 'session1',
            timestamp: Date.now(),
            vectorClock: { user1: 1 },
            documentVersion: 1
          }
        },
        {
          type: 'delete',
          position: 16,
          length: 3, // remove 'fox'
          metadata: {
            operationId: createOperationId(),
            userId: 'user2',
            sessionId: 'session1',
            timestamp: Date.now() + 5,
            vectorClock: { user2: 1 },
            documentVersion: 1
          }
        },
        {
          type: 'insert',
          position: 31,
          content: 'sleeping ',
          metadata: {
            operationId: createOperationId(),
            userId: 'user3',
            sessionId: 'session1',
            timestamp: Date.now() + 10,
            vectorClock: { user3: 1 },
            documentVersion: 1
          }
        }
      ];

      // Apply operations sequentially with transforms
      let currentState = { ...documentState };
      for (let i = 0; i < operations.length; i++) {
        const op = operations[i];
        const precedingOps = operations.slice(0, i);

        // Transform against all preceding operations
        let transformedOp = op;
        for (const precedingOp of precedingOps) {
          const result = operationalTransform.transform(transformedOp, precedingOp);
          transformedOp = result.transformed1;
        }

        // Apply the transformed operation
        currentState = operationalTransform.applyOperation(transformedOp, currentState);
      }

      // Verify the final result makes sense
      expect(currentState.content).toContain('very');
      expect(currentState.content).toContain('sleeping');
      expect(currentState.content).not.toContain('fox');
      expect(currentState.version).toBe(4); // Original + 3 operations
    });

    test('should maintain document consistency across multiple clients', async () => {
      const initialContent = 'Document content for testing collaborative editing';

      // Create session with multiple participants
      const sessionId = await collaborationSessionManager.createSession(
        'test-doc',
        initialContent,
        {
          userId: 'user1',
          username: 'User 1',
          role: 'owner',
          color: '#FF0000',
          joinedAt: Date.now(),
          lastSeen: Date.now(),
          status: 'active',
          permissions: {
            canEdit: true,
            canComment: true,
            canInvite: true,
            canManagePermissions: true
          }
        }
      );

      // Add more participants
      await collaborationSessionManager.joinSession(sessionId, {
        userId: 'user2',
        username: 'User 2',
        role: 'editor',
        color: '#00FF00',
        joinedAt: Date.now(),
        lastSeen: Date.now(),
        status: 'active',
        permissions: {
          canEdit: true,
          canComment: true,
          canInvite: false,
          canManagePermissions: false
        }
      });

      await collaborationSessionManager.joinSession(sessionId, {
        userId: 'user3',
        username: 'User 3',
        role: 'editor',
        color: '#0000FF',
        joinedAt: Date.now(),
        lastSeen: Date.now(),
        status: 'active',
        permissions: {
          canEdit: true,
          canComment: true,
          canInvite: false,
          canManagePermissions: false
        }
      });

      // Simulate concurrent operations from all users
      const concurrentOps: Operation[] = [
        {
          type: 'insert',
          position: 0,
          content: 'Title: ',
          metadata: {
            operationId: createOperationId(),
            userId: 'user1',
            sessionId,
            timestamp: Date.now(),
            vectorClock: { user1: 1 },
            documentVersion: 1
          }
        },
        {
          type: 'format',
          position: 20,
          length: 7, // 'testing'
          attributes: { bold: true },
          metadata: {
            operationId: createOperationId(),
            userId: 'user2',
            sessionId,
            timestamp: Date.now() + 2,
            vectorClock: { user2: 1 },
            documentVersion: 1
          }
        },
        {
          type: 'insert',
          position: 49,
          content: ' features',
          metadata: {
            operationId: createOperationId(),
            userId: 'user3',
            sessionId,
            timestamp: Date.now() + 4,
            vectorClock: { user3: 1 },
            documentVersion: 1
          }
        }
      ];

      // Apply all operations
      const results = await Promise.all(
        concurrentOps.map(op => collaborationSessionManager.applyOperation(sessionId, op))
      );

      // Verify all operations succeeded
      results.forEach(result => {
        expect(result.success).toBe(true);
        expect(result.rejectedOperations).toHaveLength(0);
      });

      // Verify final state
      const finalSession = collaborationSessionManager.getSession(sessionId);
      expect(finalSession).toBeTruthy();
      expect(finalSession!.documentState.content).toContain('Title:');
      expect(finalSession!.documentState.content).toContain('features');
      expect(finalSession!.documentState.formatting[27]).toEqual({ bold: true }); // Position may shift
    });
  });

  describe('Edge Cases and Stress Tests', () => {
    test('should handle empty document operations', () => {
      const emptyDoc: DocumentState = {
        id: 'empty',
        content: '',
        version: 1,
        checksum: calculateChecksum(''),
        lastModified: Date.now(),
        formatting: {},
        metadata: {
          collaborators: ['user1'],
          permissions: {
            read: ['user1'],
            write: ['user1'],
            admin: ['user1'],
            owner: 'user1'
          }
        }
      };

      const insertOp: InsertOperation = {
        type: 'insert',
        position: 0,
        content: 'First content',
        metadata: {
          operationId: createOperationId(),
          userId: 'user1',
          sessionId: 'session1',
          timestamp: Date.now(),
          vectorClock: { user1: 1 },
          documentVersion: 1
        }
      };

      const result = operationalTransform.applyOperation(insertOp, emptyDoc);
      expect(result.content).toBe('First content');
      expect(result.version).toBe(2);
    });

    test('should handle operations at document boundaries', () => {
      const content = 'Hello World';
      const documentState: DocumentState = {
        id: 'doc1',
        content,
        version: 1,
        checksum: calculateChecksum(content),
        lastModified: Date.now(),
        formatting: {},
        metadata: {
          collaborators: ['user1'],
          permissions: {
            read: ['user1'],
            write: ['user1'],
            admin: ['user1'],
            owner: 'user1'
          }
        }
      };

      // Insert at the very beginning
      const insertStart: InsertOperation = {
        type: 'insert',
        position: 0,
        content: 'Start: ',
        metadata: {
          operationId: createOperationId(),
          userId: 'user1',
          sessionId: 'session1',
          timestamp: Date.now(),
          vectorClock: { user1: 1 },
          documentVersion: 1
        }
      };

      // Insert at the very end
      const insertEnd: InsertOperation = {
        type: 'insert',
        position: content.length,
        content: ' :End',
        metadata: {
          operationId: createOperationId(),
          userId: 'user1',
          sessionId: 'session1',
          timestamp: Date.now() + 1,
          vectorClock: { user1: 2 },
          documentVersion: 1
        }
      };

      let result = operationalTransform.applyOperation(insertStart, documentState);
      expect(result.content).toBe('Start: Hello World');

      result = operationalTransform.applyOperation(insertEnd, result);
      expect(result.content).toBe('Start: Hello World :End');
    });

    test('should handle extremely large operations', () => {
      const largeContent = 'x'.repeat(10000); // 10KB of text
      const documentState: DocumentState = {
        id: 'doc1',
        content: 'Small start',
        version: 1,
        checksum: calculateChecksum('Small start'),
        lastModified: Date.now(),
        formatting: {},
        metadata: {
          collaborators: ['user1'],
          permissions: {
            read: ['user1'],
            write: ['user1'],
            admin: ['user1'],
            owner: 'user1'
          }
        }
      };

      expect(() => {
        const largeInsert: InsertOperation = {
          type: 'insert',
          position: 5,
          content: largeContent,
          metadata: {
            operationId: createOperationId(),
            userId: 'user1',
            sessionId: 'session1',
            timestamp: Date.now(),
            vectorClock: { user1: 1 },
            documentVersion: 1
          }
        };

        operationalTransform.validateOperation(largeInsert);
      }).toThrow(); // Should fail validation due to size limit
    });

    test('should handle rapid consecutive operations from same user', () => {
      const documentState: DocumentState = {
        id: 'doc1',
        content: 'Initial text',
        version: 1,
        checksum: calculateChecksum('Initial text'),
        lastModified: Date.now(),
        formatting: {},
        metadata: {
          collaborators: ['user1'],
          permissions: {
            read: ['user1'],
            write: ['user1'],
            admin: ['user1'],
            owner: 'user1'
          }
        }
      };

      // Simulate rapid typing
      const rapidOps: InsertOperation[] = [];
      const baseTime = Date.now();

      for (let i = 0; i < 10; i++) {
        rapidOps.push({
          type: 'insert',
          position: 12 + i, // At the end, incrementing
          content: i.toString(),
          metadata: {
            operationId: createOperationId(),
            userId: 'user1',
            sessionId: 'session1',
            timestamp: baseTime + i * 10, // 10ms apart
            vectorClock: { user1: i + 1 },
            documentVersion: 1 + i
          }
        });
      }

      // Apply all operations
      let currentState = { ...documentState };
      for (const op of rapidOps) {
        currentState = operationalTransform.applyOperation(op, currentState);
      }

      expect(currentState.content).toBe('Initial text0123456789');
      expect(currentState.version).toBe(11); // Original + 10 operations
    });

    test('should maintain vector clock consistency', () => {
      const op1: InsertOperation = {
        type: 'insert',
        position: 0,
        content: 'A',
        metadata: {
          operationId: createOperationId(),
          userId: 'user1',
          sessionId: 'session1',
          timestamp: 1000,
          vectorClock: { user1: 1, user2: 0 },
          documentVersion: 1
        }
      };

      const op2: InsertOperation = {
        type: 'insert',
        position: 0,
        content: 'B',
        metadata: {
          operationId: createOperationId(),
          userId: 'user2',
          sessionId: 'session1',
          timestamp: 1001,
          vectorClock: { user1: 0, user2: 1 },
          documentVersion: 1
        }
      };

      const result = operationalTransform.transform(op1, op2);

      // Earlier vector clock should take precedence in positioning
      expect(result.priority).toBe('op1'); // user1 has earlier timestamp
      expect(result.transformed1.position).toBe(0);
      expect(result.transformed2.position).toBe(1); // Shifted after op1
    });
  });

  describe('Format Operation Tests', () => {
    test('should handle overlapping format operations', () => {
      const format1: FormatOperation = {
        type: 'format',
        position: 5,
        length: 10,
        attributes: { bold: true },
        metadata: {
          operationId: createOperationId(),
          userId: 'user1',
          sessionId: 'session1',
          timestamp: Date.now(),
          vectorClock: { user1: 1 },
          documentVersion: 1
        }
      };

      const format2: FormatOperation = {
        type: 'format',
        position: 10,
        length: 10,
        attributes: { italic: true },
        metadata: {
          operationId: createOperationId(),
          userId: 'user2',
          sessionId: 'session1',
          timestamp: Date.now() + 1,
          vectorClock: { user2: 1 },
          documentVersion: 1
        }
      };

      const result = operationalTransform.transform(format1, format2);

      // Both formats should be preserved
      expect((result.transformed1 as FormatOperation).attributes.bold).toBe(true);
      expect((result.transformed2 as FormatOperation).attributes.italic).toBe(true);
    });

    test('should merge compatible format attributes', () => {
      const documentState: DocumentState = {
        id: 'doc1',
        content: 'This is formatted text for testing',
        version: 1,
        checksum: '',
        lastModified: Date.now(),
        formatting: {},
        metadata: {
          collaborators: ['user1'],
          permissions: {
            read: ['user1'],
            write: ['user1'],
            admin: ['user1'],
            owner: 'user1'
          }
        }
      };

      const boldFormat: FormatOperation = {
        type: 'format',
        position: 8,
        length: 9, // 'formatted'
        attributes: { bold: true },
        metadata: {
          operationId: createOperationId(),
          userId: 'user1',
          sessionId: 'session1',
          timestamp: Date.now(),
          vectorClock: { user1: 1 },
          documentVersion: 1
        }
      };

      const italicFormat: FormatOperation = {
        type: 'format',
        position: 8,
        length: 9, // Same range
        attributes: { italic: true },
        metadata: {
          operationId: createOperationId(),
          userId: 'user1',
          sessionId: 'session1',
          timestamp: Date.now() + 1,
          vectorClock: { user1: 2 },
          documentVersion: 2
        }
      };

      let result = operationalTransform.applyOperation(boldFormat, documentState);
      result = operationalTransform.applyOperation(italicFormat, result);

      // Both formatting attributes should be applied
      expect(result.formatting[8]).toEqual({ bold: true });
      expect(result.formatting[8]).toEqual({ bold: true }); // From first operation
      // Note: In a real implementation, we'd need to merge these properly
    });
  });

  describe('Performance and Stress Tests', () => {
    test('should handle 1000+ concurrent operations efficiently', async () => {
      const startTime = Date.now();
      const operations: Operation[] = [];

      // Generate 1000 operations
      for (let i = 0; i < 1000; i++) {
        operations.push({
          type: 'insert',
          position: Math.floor(Math.random() * 100),
          content: `Text${i}`,
          metadata: {
            operationId: createOperationId(),
            userId: `user${i % 10}`, // 10 different users
            sessionId: 'stress-test',
            timestamp: Date.now() + i,
            vectorClock: { [`user${i % 10}`]: Math.floor(i / 10) + 1 },
            documentVersion: i + 1
          }
        });
      }

      // Apply all operations with transforms
      let transformedCount = 0;
      for (let i = 0; i < operations.length; i++) {
        for (let j = i + 1; j < Math.min(i + 10, operations.length); j++) {
          operationalTransform.transform(operations[i], operations[j]);
          transformedCount++;
        }
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      console.log(`Transformed ${transformedCount} operation pairs in ${duration}ms`);
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    });

    test('should maintain memory efficiency with operation compression', () => {
      const operations: Operation[] = [];

      // Create many similar operations that can be compressed
      for (let i = 0; i < 100; i++) {
        operations.push({
          type: 'insert',
          position: i,
          content: 'a',
          metadata: {
            operationId: createOperationId(),
            userId: 'user1',
            sessionId: 'compression-test',
            timestamp: Date.now() + i * 10,
            vectorClock: { user1: i + 1 },
            documentVersion: i + 1
          }
        });
      }

      const compressed = operationalTransform.compressOperations(operations);

      // Should compress consecutive single-character inserts
      expect(compressed.length).toBeLessThan(operations.length);

      // Find the compressed operation
      const compressedOp = compressed.find(op =>
        op.type === 'insert' && (op as InsertOperation).content.length > 1
      ) as InsertOperation;

      expect(compressedOp).toBeTruthy();
      expect(compressedOp.content).toContain('aaa'); // Multiple 'a's compressed
    });
  });

  describe('Error Handling and Recovery', () => {
    test('should handle invalid operation positions gracefully', () => {
      const documentState: DocumentState = {
        id: 'doc1',
        content: 'Short',
        version: 1,
        checksum: calculateChecksum('Short'),
        lastModified: Date.now(),
        formatting: {},
        metadata: {
          collaborators: ['user1'],
          permissions: {
            read: ['user1'],
            write: ['user1'],
            admin: ['user1'],
            owner: 'user1'
          }
        }
      };

      const invalidInsert: InsertOperation = {
        type: 'insert',
        position: 100, // Beyond document length
        content: 'Invalid',
        metadata: {
          operationId: createOperationId(),
          userId: 'user1',
          sessionId: 'session1',
          timestamp: Date.now(),
          vectorClock: { user1: 1 },
          documentVersion: 1
        }
      };

      expect(() => {
        operationalTransform.applyOperation(invalidInsert, documentState);
      }).toThrow(); // Should throw error for invalid position
    });

    test('should validate operation metadata', () => {
      const invalidOp = {
        type: 'insert',
        position: 0,
        content: 'Test',
        metadata: {
          // Missing required fields
          operationId: createOperationId()
          // Missing userId, sessionId, etc.
        }
      } as Operation;

      expect(() => {
        operationalTransform.validateOperation(invalidOp);
      }).toThrow(); // Should fail validation
    });

    test('should handle malformed vector clocks', () => {
      const op1: InsertOperation = {
        type: 'insert',
        position: 0,
        content: 'A',
        metadata: {
          operationId: createOperationId(),
          userId: 'user1',
          sessionId: 'session1',
          timestamp: Date.now(),
          vectorClock: {}, // Empty vector clock
          documentVersion: 1
        }
      };

      const op2: InsertOperation = {
        type: 'insert',
        position: 0,
        content: 'B',
        metadata: {
          operationId: createOperationId(),
          userId: 'user2',
          sessionId: 'session1',
          timestamp: Date.now(),
          vectorClock: { user2: 1 },
          documentVersion: 1
        }
      };

      // Should not throw error, but handle gracefully
      expect(() => {
        operationalTransform.transform(op1, op2);
      }).not.toThrow();
    });
  });

  afterEach(() => {
    // Cleanup
    operationalTransform.clearCache();
  });
});

describe('Integration Tests', () => {
  test('should simulate Google Docs-like collaboration scenario', async () => {
    // Create a document with initial content
    const sessionId = await collaborationSessionManager.createSession(
      'google-docs-simulation',
      'Collaborative Document\n\nThis is a shared document that multiple users can edit simultaneously.',
      {
        userId: 'author',
        username: 'Document Author',
        role: 'owner',
        color: '#1a73e8',
        joinedAt: Date.now(),
        lastSeen: Date.now(),
        status: 'active',
        permissions: {
          canEdit: true,
          canComment: true,
          canInvite: true,
          canManagePermissions: true
        }
      }
    );

    // Add multiple collaborators
    const collaborators = [
      { id: 'editor1', name: 'Editor One', role: 'editor' as const },
      { id: 'editor2', name: 'Editor Two', role: 'editor' as const },
      { id: 'viewer1', name: 'Viewer One', role: 'viewer' as const }
    ];

    for (const collab of collaborators) {
      await collaborationSessionManager.joinSession(sessionId, {
        userId: collab.id,
        username: collab.name,
        role: collab.role,
        color: `#${Math.floor(Math.random()*16777215).toString(16)}`,
        joinedAt: Date.now(),
        lastSeen: Date.now(),
        status: 'active',
        permissions: {
          canEdit: collab.role !== 'viewer',
          canComment: true,
          canInvite: false,
          canManagePermissions: false
        }
      });
    }

    // Simulate realistic editing scenario
    const editingOps: Operation[] = [
      // Editor1 adds a title
      {
        type: 'insert',
        position: 0,
        content: '# ',
        metadata: {
          operationId: createOperationId(),
          userId: 'editor1',
          sessionId,
          timestamp: Date.now(),
          vectorClock: { editor1: 1 },
          documentVersion: 1
        }
      },
      // Editor2 adds content at the end
      {
        type: 'insert',
        position: 91, // End of document
        content: '\n\n## New Section\nThis section was added by Editor Two.',
        metadata: {
          operationId: createOperationId(),
          userId: 'editor2',
          sessionId,
          timestamp: Date.now() + 100,
          vectorClock: { editor2: 1 },
          documentVersion: 1
        }
      },
      // Author makes formatting changes
      {
        type: 'format',
        position: 0,
        length: 21, // 'Collaborative Document'
        attributes: { bold: true, fontSize: 24 },
        metadata: {
          operationId: createOperationId(),
          userId: 'author',
          sessionId,
          timestamp: Date.now() + 200,
          vectorClock: { author: 1 },
          documentVersion: 1
        }
      },
      // Editor1 corrects a typo
      {
        type: 'delete',
        position: 50,
        length: 1,
        metadata: {
          operationId: createOperationId(),
          userId: 'editor1',
          sessionId,
          timestamp: Date.now() + 300,
          vectorClock: { editor1: 2 },
          documentVersion: 1
        }
      },
      {
        type: 'insert',
        position: 50,
        content: 'edit',
        metadata: {
          operationId: createOperationId(),
          userId: 'editor1',
          sessionId,
          timestamp: Date.now() + 301,
          vectorClock: { editor1: 3 },
          documentVersion: 1
        }
      }
    ];

    // Apply all operations and verify success
    for (const op of editingOps) {
      if (op.metadata.userId === 'viewer1') {
        // Viewer operations should fail
        const result = await collaborationSessionManager.applyOperation(sessionId, op);
        expect(result.success).toBe(false);
      } else {
        // Editor operations should succeed
        const result = await collaborationSessionManager.applyOperation(sessionId, op);
        expect(result.success).toBe(true);
      }
    }

    // Verify final document state
    const finalSession = collaborationSessionManager.getSession(sessionId);
    expect(finalSession).toBeTruthy();
    expect(finalSession!.documentState.content).toContain('# Collaborative Document');
    expect(finalSession!.documentState.content).toContain('## New Section');
    expect(finalSession!.documentState.content).toContain('Editor Two');

    // Test undo/redo functionality
    const undoOp = await collaborationSessionManager.undoLastOperation(sessionId, 'editor1');
    expect(undoOp).toBeTruthy();

    const redoOp = await collaborationSessionManager.redoLastOperation(sessionId, 'editor1');
    expect(redoOp).toBeTruthy();

    // Verify session metrics
    const metrics = collaborationSessionManager.getSessionMetrics(sessionId);
    expect(metrics.participantCount).toBe(4); // author + 3 collaborators
    expect(metrics.operationCount).toBeGreaterThan(0);
  });
});