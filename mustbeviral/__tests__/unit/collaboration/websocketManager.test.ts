/**
 * WebSocket Manager Unit Tests
 * Comprehensive testing for real-time collaboration infrastructure
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { WebSocketManager, type UserPresence, type WebSocketMessage } from '../../../src/lib/collaboration/websocketManager';
import { MockWebSocket, testUtils } from '../../utils/testHelpers';

describe('WebSocketManager', () => {
  let wsManager: WebSocketManager;
  let mockWs: MockWebSocket;
  let messageHandlers: Map<string, Function[]>;

  beforeEach(() => {
    testUtils.setupMocks();
    
    wsManager = new WebSocketManager({
      reconnectInterval: 1000,
      maxReconnectAttempts: 3,
      heartbeatInterval: 5000,
      messageTimeout: 5000,
      enablePresence: true,
      enableTyping: true,
      enableCursor: true,
    });
    
    messageHandlers = new Map();
    
    // Mock WebSocket constructor
    (global as any).WebSocket = jest.fn().mockImplementation((url: string) => {
      mockWs = new MockWebSocket(url);
      return mockWs;
    });
  });

  afterEach(() => {
    testUtils.cleanup();
    if (wsManager) {
      wsManager.disconnect();
    }
  });

  describe('Connection Management', () => {
    test('should connect successfully', async () => {
      const connectPromise = wsManager.connect('ws://localhost:8080', 'user123', 'token456');
      
      // Simulate successful connection
      setTimeout(() => mockWs.onopen?.(), 10);
      
      await expect(connectPromise).resolves.toBeUndefined();
      expect(wsManager.isConnectedToServer()).toBe(true);
    });

    test('should handle connection errors', async () => {
      const connectPromise = wsManager.connect('ws://invalid-url', 'user123');
      
      // Simulate connection error
      setTimeout(() => mockWs.onerror?.(new Error('Connection failed')), 10);
      
      await expect(connectPromise).rejects.toThrow('Connection failed');
    });

    test('should reconnect after unexpected disconnection', async () => {
      // Connect first
      const connectPromise = wsManager.connect('ws://localhost:8080', 'user123');
      setTimeout(() => mockWs.onopen?.(), 10);
      await connectPromise;
      
      expect(wsManager.isConnectedToServer()).toBe(true);
      
      // Simulate unexpected disconnection
      mockWs.close(1006, 'Abnormal closure');
      
      // Should trigger reconnection attempt
      expect(wsManager.getConnectionStats().reconnectAttempts).toBeGreaterThan(0);
    });

    test('should not reconnect on normal closure', async () => {
      const connectPromise = wsManager.connect('ws://localhost:8080', 'user123');
      setTimeout(() => mockWs.onopen?.(), 10);
      await connectPromise;
      
      const initialReconnectAttempts = wsManager.getConnectionStats().reconnectAttempts;
      
      // Normal closure
      mockWs.close(1000, 'Normal closure');
      
      // Should not trigger reconnection
      expect(wsManager.getConnectionStats().reconnectAttempts).toBe(initialReconnectAttempts);
    });

    test('should stop reconnecting after max attempts', async () => {
      const connectPromise = wsManager.connect('ws://localhost:8080', 'user123');
      setTimeout(() => mockWs.onopen?.(), 10);
      await connectPromise;
      
      // Simulate multiple failures
      for (let i = 0; i < 5; i++) {
        mockWs.close(1006, 'Abnormal closure');
        await testUtils.waitFor(100);
      }
      
      const stats = wsManager.getConnectionStats();
      expect(stats.reconnectAttempts).toBeLessThanOrEqual(3);
    });
  });

  describe('Message Handling', () => {
    beforeEach(async () => {
      const connectPromise = wsManager.connect('ws://localhost:8080', 'user123');
      setTimeout(() => mockWs.onopen?.(), 10);
      await connectPromise;
    });

    test('should send messages when connected', () => {
      wsManager.sendMessage('test-message', { data: 'hello' }, 'room123');
      
      const messages = mockWs.getMessageQueue();
      expect(messages).toHaveLength(1);
      
      const sentMessage: WebSocketMessage = JSON.parse(messages[0]);
      expect(sentMessage.type).toBe('test-message');
      expect(sentMessage.payload).toEqual({ data: 'hello' });
      expect(sentMessage.roomId).toBe('room123');
      expect(sentMessage.userId).toBeDefined();
    });

    test('should queue messages when disconnected', () => {
      // Disconnect
      mockWs.close(1000);
      
      wsManager.sendMessage('queued-message', { data: 'queued' });
      
      const stats = wsManager.getConnectionStats();
      expect(stats.queuedMessages).toBe(1);
    });

    test('should process queued messages on reconnection', async () => {
      // Disconnect
      mockWs.close(1006);
      
      // Send messages while disconnected
      wsManager.sendMessage('msg1', { data: '1' });
      wsManager.sendMessage('msg2', { data: '2' });
      
      expect(wsManager.getConnectionStats().queuedMessages).toBe(2);
      
      // Reconnect
      const reconnectPromise = wsManager.connect('ws://localhost:8080', 'user123');
      setTimeout(() => mockWs.onopen?.(), 10);
      await reconnectPromise;
      
      // Messages should be sent
      await testUtils.waitFor(50);
      expect(wsManager.getConnectionStats().queuedMessages).toBe(0);
    });

    test('should handle incoming messages', () => {
      const messageHandler = jest.fn();
      wsManager.onMessage('room-message', messageHandler);
      
      const incomingMessage = {
        type: 'room-message',
        payload: { text: 'Hello everyone!' },
        userId: 'user456',
        timestamp: Date.now(),
        messageId: 'msg123',
        roomId: 'room123'
      };
      
      mockWs.simulateMessage(incomingMessage);
      
      expect(messageHandler).toHaveBeenCalledWith(
        incomingMessage.payload,
        incomingMessage
      );
    });

    test('should handle multiple handlers for same message type', () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();
      
      wsManager.onMessage('typing', handler1);
      wsManager.onMessage('typing', handler2);
      
      const typingMessage = {
        type: 'typing',
        payload: { isTyping: true },
        userId: 'user456',
        timestamp: Date.now(),
        messageId: 'typing123'
      };
      
      mockWs.simulateMessage(typingMessage);
      
      expect(handler1).toHaveBeenCalled();
      expect(handler2).toHaveBeenCalled();
    });

    test('should remove message handlers', () => {
      const handler = jest.fn();
      
      wsManager.onMessage('test-event', handler);
      wsManager.offMessage('test-event', handler);
      
      mockWs.simulateMessage({
        type: 'test-event',
        payload: {},
        userId: 'user123',
        timestamp: Date.now(),
        messageId: 'test123'
      });
      
      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('Room Management', () => {
    beforeEach(async () => {
      const connectPromise = wsManager.connect('ws://localhost:8080', 'user123');
      setTimeout(() => mockWs.onopen?.(), 10);
      await connectPromise;
    });

    test('should join room with user presence', async () => {
      const userInfo = {
        username: 'TestUser',
        avatar: 'avatar.jpg'
      };
      
      await wsManager.joinRoom('room123', userInfo);
      
      const messages = mockWs.getMessageQueue();
      const joinMessage: WebSocketMessage = JSON.parse(messages[messages.length - 1]);
      
      expect(joinMessage.type).toBe('join-room');
      expect(joinMessage.payload.roomId).toBe('room123');
      expect(joinMessage.payload.userPresence.username).toBe('TestUser');
      expect(joinMessage.payload.userPresence.status).toBe('online');
    });

    test('should leave room', () => {
      wsManager.leaveRoom('room123');
      
      const messages = mockWs.getMessageQueue();
      const leaveMessage: WebSocketMessage = JSON.parse(messages[messages.length - 1]);
      
      expect(leaveMessage.type).toBe('leave-room');
      expect(leaveMessage.payload.roomId).toBe('room123');
    });

    test('should handle room joined event', () => {
      const roomData = {
        room: {
          id: 'room123',
          name: 'Test Room',
          type: 'content-editing',
          createdAt: Date.now(),
          metadata: {}
        },
        participants: [
          {
            userId: 'user123',
            username: 'User 1',
            status: 'online',
            lastSeen: Date.now()
          },
          {
            userId: 'user456',
            username: 'User 2',
            status: 'online',
            lastSeen: Date.now()
          }
        ]
      };
      
      mockWs.simulateMessage({
        type: 'room-joined',
        payload: roomData,
        userId: 'system',
        timestamp: Date.now(),
        messageId: 'room-join-123'
      });
      
      const room = wsManager.getRoom('room123');
      expect(room).toBeDefined();
      expect(room?.participants.size).toBe(2);
      expect(room?.name).toBe('Test Room');
    });

    test('should handle user joined room event', () => {
      // First setup room
      mockWs.simulateMessage({
        type: 'room-joined',
        payload: {
          room: { id: 'room123', name: 'Test Room', type: 'general', createdAt: Date.now() },
          participants: []
        },
        userId: 'system',
        timestamp: Date.now(),
        messageId: 'setup123'
      });
      
      // Then add user
      const newUser = {
        userId: 'user789',
        username: 'New User',
        status: 'online' as const,
        lastSeen: Date.now()
      };
      
      mockWs.simulateMessage({
        type: 'user-joined',
        payload: {
          roomId: 'room123',
          userPresence: newUser
        },
        userId: 'system',
        timestamp: Date.now(),
        messageId: 'user-join-123'
      });
      
      const participants = wsManager.getRoomParticipants('room123');
      expect(participants).toHaveLength(1);
      expect(participants[0].userId).toBe('user789');
    });
  });

  describe('Presence Management', () => {
    beforeEach(async () => {
      const connectPromise = wsManager.connect('ws://localhost:8080', 'user123');
      setTimeout(() => mockWs.onopen?.(), 10);
      await connectPromise;
    });

    test('should update user presence status', () => {
      wsManager.updatePresence('away');
      
      const messages = mockWs.getMessageQueue();
      const presenceMessage: WebSocketMessage = JSON.parse(messages[messages.length - 1]);
      
      expect(presenceMessage.type).toBe('presence-update');
      expect(presenceMessage.payload.status).toBe('away');
      expect(presenceMessage.payload.userId).toBeDefined();
    });

    test('should handle presence updates from other users', () => {
      const presenceUpdate = {
        userId: 'user456',
        status: 'busy' as const,
        lastSeen: Date.now()
      };
      
      mockWs.simulateMessage({
        type: 'presence-update',
        payload: presenceUpdate,
        userId: 'system',
        timestamp: Date.now(),
        messageId: 'presence123'
      });
      
      const userPresence = wsManager.getUserPresence('user456');
      expect(userPresence?.status).toBe('busy');
    });
  });

  describe('Real-time Features', () => {
    beforeEach(async () => {
      const connectPromise = wsManager.connect('ws://localhost:8080', 'user123');
      setTimeout(() => mockWs.onopen?.(), 10);
      await connectPromise;
    });

    test('should send typing indicators', () => {
      wsManager.sendTyping('room123', true, { contentId: 'doc456', position: 100 });
      
      const messages = mockWs.getMessageQueue();
      const typingMessage: WebSocketMessage = JSON.parse(messages[messages.length - 1]);
      
      expect(typingMessage.type).toBe('typing');
      expect(typingMessage.payload.isTyping).toBe(true);
      expect(typingMessage.payload.context.contentId).toBe('doc456');
    });

    test('should send cursor positions', () => {
      const position = { x: 150, y: 200, elementId: 'editor' };
      
      wsManager.sendCursorPosition('room123', position);
      
      const messages = mockWs.getMessageQueue();
      const cursorMessage: WebSocketMessage = JSON.parse(messages[messages.length - 1]);
      
      expect(cursorMessage.type).toBe('cursor-position');
      expect(cursorMessage.payload.position).toEqual(position);
    });

    test('should send content updates', () => {
      const update = {
        contentId: 'doc123',
        operation: 'insert' as const,
        position: 50,
        content: 'Hello World'
      };
      
      wsManager.sendContentUpdate('room123', update);
      
      const messages = mockWs.getMessageQueue();
      const updateMessage: WebSocketMessage = JSON.parse(messages[messages.length - 1]);
      
      expect(updateMessage.type).toBe('content-update');
      expect(updateMessage.payload.update).toEqual(update);
    });

    test('should disable features when configured', () => {
      const disabledWsManager = new WebSocketManager({
        enableTyping: false,
        enableCursor: false,
        enablePresence: false
      });
      
      // These should not send messages when disabled
      disabledWsManager.sendTyping('room123', true);
      disabledWsManager.sendCursorPosition('room123', { x: 0, y: 0 });
      disabledWsManager.updatePresence('away');
      
      // No messages should be queued
      expect(disabledWsManager.getConnectionStats().queuedMessages).toBe(0);
    });
  });

  describe('Error Handling', () => {
    test('should handle malformed incoming messages', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      // Send malformed JSON
      mockWs.onmessage?.({ data: 'invalid json {' } as any);
      
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to parse WebSocket message:',
        expect.any(Error)
      );
      
      consoleSpy.mockRestore();
    });

    test('should handle message handler errors gracefully', () => {
      const faultyHandler = jest.fn().mockImplementation(() => {
        throw new Error('Handler error');
      });
      const goodHandler = jest.fn();
      
      wsManager.onMessage('test-message', faultyHandler);
      wsManager.onMessage('test-message', goodHandler);
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      mockWs.simulateMessage({
        type: 'test-message',
        payload: {},
        userId: 'user123',
        timestamp: Date.now(),
        messageId: 'test123'
      });
      
      // Faulty handler should error but good handler should still run
      expect(consoleSpy).toHaveBeenCalled();
      expect(goodHandler).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });

    test('should handle WebSocket errors', () => {
      const errorSpy = jest.spyOn(console, 'error').mockImplementation();
      
      mockWs.simulateError(new Error('WebSocket error'));
      
      expect(errorSpy).toHaveBeenCalled();
      
      errorSpy.mockRestore();
    });
  });

  describe('Performance and Statistics', () => {
    beforeEach(async () => {
      const connectPromise = wsManager.connect('ws://localhost:8080', 'user123');
      setTimeout(() => mockWs.onopen?.(), 10);
      await connectPromise;
    });

    test('should provide connection statistics', () => {
      const stats = wsManager.getConnectionStats();
      
      expect(stats).toHaveProperty('connected');
      expect(stats).toHaveProperty('reconnectAttempts');
      expect(stats).toHaveProperty('queuedMessages');
      expect(stats).toHaveProperty('totalRooms');
      expect(stats).toHaveProperty('totalUsers');
      
      expect(typeof stats.connected).toBe('boolean');
      expect(typeof stats.reconnectAttempts).toBe('number');
    });

    test('should track message queue efficiently', () => {
      // Disconnect to queue messages
      mockWs.close(1006);
      
      // Send multiple messages
      for (let i = 0; i < 100; i++) {
        wsManager.sendMessage('bulk-message', { index: i });
      }
      
      const stats = wsManager.getConnectionStats();
      expect(stats.queuedMessages).toBe(100);
    });

    test('should handle concurrent operations efficiently', async () => {
      const operations = [];
      
      // Simulate concurrent room joins
      for (let i = 0; i < 50; i++) {
        operations.push(wsManager.joinRoom(`room${i}`, { username: `User${i}` }));
      }
      
      // Simulate concurrent message sends
      for (let i = 0; i < 50; i++) {
        wsManager.sendMessage('concurrent-test', { index: i });
      }
      
      await Promise.all(operations);
      
      const messages = mockWs.getMessageQueue();
      expect(messages.length).toBe(100); // 50 joins + 50 messages
    });
  });

  describe('Cleanup and Disconnection', () => {
    test('should clean up resources on disconnect', async () => {
      const connectPromise = wsManager.connect('ws://localhost:8080', 'user123');
      setTimeout(() => mockWs.onopen?.(), 10);
      await connectPromise;
      
      // Add some state
      await wsManager.joinRoom('room123');
      wsManager.sendMessage('test', {});
      
      // Disconnect
      wsManager.disconnect();
      
      expect(wsManager.isConnectedToServer()).toBe(false);
      expect(mockWs.readyState).toBe(3); // CLOSED
    });

    test('should handle multiple disconnect calls safely', async () => {
      const connectPromise = wsManager.connect('ws://localhost:8080', 'user123');
      setTimeout(() => mockWs.onopen?.(), 10);
      await connectPromise;
      
      // Multiple disconnects should not cause errors
      wsManager.disconnect();
      wsManager.disconnect();
      wsManager.disconnect();
      
      expect(wsManager.isConnectedToServer()).toBe(false);
    });
  });
});