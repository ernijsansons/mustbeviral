// Collaboration Room Durable Object
// Manages real-time collaborative editing with operational transforms

import { Logger } from '../utils/logger';

export interface Operation {
  type: 'insert' | 'delete' | 'retain';
  text?: string;
  length?: number;
  position: number;
  clientId: string;
  timestamp: number;
  operationId: string;
}

export interface DocumentState {
  content: string;
  version: number;
  lastModified: number;
  lastModifiedBy: string;
}

export interface Collaborator {
  websocket: WebSocket;
  userId: string;
  username: string;
  clientId: string;
  cursor: {
    position: number;
    selection?: { start: number; end: number };
  };
  lastActivity: number;
  color: string;
  isTyping: boolean;
}

export interface CollaborationMessage {
  type: string;
  from: string;
  data: unknown;
  timestamp: number;
  messageId: string;
}

export class CollaborationRoom {
  private collaborators: Map<string, Collaborator> = new Map();
  private contentId: string;
  private document: DocumentState;
  private operationHistory: Operation[] = [];
  private pendingOperations: Map<string, Operation[]> = new Map();
  private logger: Logger;
  private saveTimeout: unknown;

  constructor(private state: DurableObjectState, private env: unknown) {
    this.contentId = state.id.toString();
    this.logger = new Logger('CollaborationRoom', env.LOG_LEVEL || 'INFO');

    // Initialize document state
    this.document = {
      content: '',
      version: 0,
      lastModified: Date.now(),
      lastModifiedBy: 'system'
    };

    // Load persisted state
    this.loadPersistedState();
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    try {
      switch (path) {
        case '/connect':
          return this.handleConnect(request);
        case '/status':
          return this.handleStatus(request);
        case '/operation':
          return this.handleOperation(request);
        case '/save':
          return this.handleSave(request);
        case '/sync':
          return this.handleSync(request);
        default:
          return new Response('Not found', { status: 404 });
      }
    } catch (error) {
      this.logger.error('CollaborationRoom request failed', {
        contentId: this.contentId,
        path,
        error: error instanceof Error ? error.message : error
      });

      return new Response('Internal error', { status: 500 });
    }
  }

  async handleConnect(request: Request): Promise<Response> {
    // Validate WebSocket upgrade
    if (request.headers.get('Upgrade') !== 'websocket') {
      return new Response('Expected WebSocket upgrade', { status: 400 });
    }

    // Extract collaborator info
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');
    const username = url.searchParams.get('username');
    const clientId = url.searchParams.get('clientId') || crypto.randomUUID();

    if (!userId || !username) {
      return new Response('Missing collaborator credentials', { status: 400 });
    }

    // Create WebSocket pair
    const [client, server] = new WebSocketPair();
    server.accept();

    // Create collaborator
    const collaborator: Collaborator = {
      websocket: server,
      userId,
      username,
      clientId,
      cursor: { position: 0 },
      lastActivity: Date.now(),
      color: this.generateUserColor(userId),
      isTyping: false
    };

    this.collaborators.set(clientId, collaborator);

    // Set up WebSocket event handlers
    server.addEventListener('message', (_event) => {
      this.handleWebSocketMessage(clientId, event);
    });

    server.addEventListener('close', () => {
      this.handleWebSocketClose(clientId);
    });

    server.addEventListener('error', (_error) => {
      this.logger.error('WebSocket error in collaboration', {
        contentId: this.contentId,
        clientId,
        userId,
        error
      });
      this.handleWebSocketClose(clientId);
    });

    // Send initial state
    const welcomeMessage: CollaborationMessage = {
      type: 'welcome',
      from: 'system',
      data: { _clientId,
        document: this.document,
        collaborators: this.getCollaboratorList(),
        contentId: this.contentId
      },
      timestamp: Date.now(),
      messageId: crypto.randomUUID()
    };

    server.send(JSON.stringify(welcomeMessage));

    // Notify other collaborators
    this.broadcastMessage({
      type: 'collaborator_joined',
      from: 'system',
      data: { _userId,
        username,
        clientId,
        color: collaborator.color
      },
      timestamp: Date.now(),
      messageId: crypto.randomUUID()
    }, clientId);

    this.logger.info('Collaborator joined', {
      contentId: this.contentId,
      userId,
      username,
      clientId,
      totalCollaborators: this.collaborators.size
    });

    return new Response(null, {
      status: 101,
      webSocket: client
    });
  }

  async handleWebSocketMessage(clientId: string, event: MessageEvent): Promise<void> {
    const collaborator = this.collaborators.get(clientId);
    if (!collaborator) return;

    try {
      const message = JSON.parse(event.data as string);
      collaborator.lastActivity = Date.now();

      switch (message.type) {
        case 'operation':
          await this.handleCollaborativeOperation(clientId, message.data);
          break;
        case 'cursor':
          await this.handleCursorUpdate(clientId, message.data);
          break;
        case 'selection':
          await this.handleSelectionUpdate(clientId, message.data);
          break;
        case 'typing':
          await this.handleTypingIndicator(clientId, message.data);
          break;
        case 'ping':
          await this.handlePing(clientId);
          break;
        case 'sync_request':
          await this.handleSyncRequest(clientId);
          break;
        default:
          this.logger.warn('Unknown collaboration message type', {
            contentId: this.contentId,
            clientId,
            type: message.type
          });
      }
    } catch (error) {
      this.logger.error('Failed to handle collaboration message', {
        contentId: this.contentId,
        clientId,
        error: error instanceof Error ? error.message : error
      });

      collaborator.websocket.send(JSON.stringify({
        type: 'error',
        from: 'system',
        data: { message: 'Invalid message format' },
        timestamp: Date.now(),
        messageId: crypto.randomUUID()
      }));
    }
  }

  async handleCollaborativeOperation(clientId: string, operationData: unknown): Promise<void> {
    const collaborator = this.collaborators.get(clientId);
    if (!collaborator) return;

    const operation: Operation = {
      ...operationData,
      clientId,
      timestamp: Date.now(),
      operationId: crypto.randomUUID()
    };

    // Apply operational transform
    const transformedOperation = this.transformOperation(operation);

    if (transformedOperation) {
      // Apply to document
      this.applyOperation(transformedOperation);

      // Add to history
      this.operationHistory.push(transformedOperation);

      // Broadcast to other collaborators
      this.broadcastMessage({
        type: 'operation',
        from: collaborator.userId,
        data: {
          operation: transformedOperation,
          document: this.document
        },
        timestamp: Date.now(),
        messageId: crypto.randomUUID()
      }, clientId);

      // Schedule save
      this.scheduleSave();
    }

    // Send acknowledgment
    collaborator.websocket.send(JSON.stringify({
      type: 'operation_ack',
      from: 'system',
      data: {
        operationId: operation.operationId,
        documentVersion: this.document.version
      },
      timestamp: Date.now(),
      messageId: crypto.randomUUID()
    }));
  }

  private transformOperation(operation: Operation): Operation | null {
    // Simple operational transform - in production, use a robust OT library
    const currentContent = this.document.content;

    // Validate operation bounds
    if (operation.position < 0 || operation.position > currentContent.length) {
      this.logger.warn('Operation position out of bounds', {
        contentId: this.contentId,
        operation,
        contentLength: currentContent.length
      });
      return null;
    }

    if (operation.type === 'delete' &&
        operation.length &&
        operation.position + operation.length > currentContent.length) {
      // Adjust delete length
      operation.length = currentContent.length - operation.position;
    }

    return operation;
  }

  private applyOperation(operation: Operation): void {
    let content = this.document.content;

    switch (operation.type) {
      case 'insert':
        if (operation.text) {
          content = content.slice(0, operation.position) +
                   operation.text +
                   content.slice(operation.position);
        }
        break;
      case 'delete':
        if (operation.length) {
          content = content.slice(0, operation.position) +
                   content.slice(operation.position + operation.length);
        }
        break;
      case 'retain':
        // No change to content for retain operations
        break;
    }

    this.document = { _content,
      version: this.document.version + 1,
      lastModified: Date.now(),
      lastModifiedBy: operation.clientId
    };
  }

  async handleCursorUpdate(clientId: string, cursorData: unknown): Promise<void> {
    const collaborator = this.collaborators.get(clientId);
    if (!collaborator) return;

    collaborator.cursor = cursorData;

    this.broadcastMessage({
      type: 'cursor',
      from: collaborator.userId,
      data: { _clientId,
        username: collaborator.username,
        cursor: cursorData,
        color: collaborator.color
      },
      timestamp: Date.now(),
      messageId: crypto.randomUUID()
    }, clientId);
  }

  async handleSelectionUpdate(clientId: string, selectionData: unknown): Promise<void> {
    const collaborator = this.collaborators.get(clientId);
    if (!collaborator) return;

    collaborator.cursor.selection = selectionData;

    this.broadcastMessage({
      type: 'selection',
      from: collaborator.userId,
      data: { _clientId,
        username: collaborator.username,
        selection: selectionData,
        color: collaborator.color
      },
      timestamp: Date.now(),
      messageId: crypto.randomUUID()
    }, clientId);
  }

  async handleTypingIndicator(clientId: string, typingData: unknown): Promise<void> {
    const collaborator = this.collaborators.get(clientId);
    if (!collaborator) return;

    collaborator.isTyping = typingData.isTyping;

    this.broadcastMessage({
      type: 'typing',
      from: collaborator.userId,
      data: { _clientId,
        username: collaborator.username,
        isTyping: typingData.isTyping
      },
      timestamp: Date.now(),
      messageId: crypto.randomUUID()
    }, clientId);
  }

  async handlePing(clientId: string): Promise<void> {
    const collaborator = this.collaborators.get(clientId);
    if (!collaborator) return;

    collaborator.websocket.send(JSON.stringify({
      type: 'pong',
      from: 'system',
      data: { timestamp: Date.now() },
      timestamp: Date.now(),
      messageId: crypto.randomUUID()
    }));
  }

  async handleSyncRequest(clientId: string): Promise<void> {
    const collaborator = this.collaborators.get(clientId);
    if (!collaborator) return;

    collaborator.websocket.send(JSON.stringify({
      type: 'sync',
      from: 'system',
      data: {
        document: this.document,
        collaborators: this.getCollaboratorList()
      },
      timestamp: Date.now(),
      messageId: crypto.randomUUID()
    }));
  }

  handleWebSocketClose(clientId: string): void {
    const collaborator = this.collaborators.get(clientId);
    if (!collaborator) return;

    // Notify other collaborators
    this.broadcastMessage({
      type: 'collaborator_left',
      from: 'system',
      data: {
        userId: collaborator.userId,
        username: collaborator.username,
        clientId
      },
      timestamp: Date.now(),
      messageId: crypto.randomUUID()
    });

    // Remove collaborator
    this.collaborators.delete(clientId);

    this.logger.info('Collaborator left', {
      contentId: this.contentId,
      userId: collaborator.userId,
      username: collaborator.username,
      clientId,
      totalCollaborators: this.collaborators.size
    });

    // Save if no active collaborators
    if (this.collaborators.size === 0) {
      this.saveDocument();
    }
  }

  async handleStatus(request: Request): Promise<Response> {
    return new Response(JSON.stringify({
      contentId: this.contentId,
      collaborators: this.getCollaboratorList(),
      document: {
        version: this.document.version,
        lastModified: this.document.lastModified,
        lastModifiedBy: this.document.lastModifiedBy,
        contentLength: this.document.content.length
      }
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  async handleOperation(request: Request): Promise<Response> {
    const operation = await request.json() as Operation;

    // Apply and broadcast operation
    const transformedOperation = this.transformOperation(operation);
    if (transformedOperation) {
      this.applyOperation(transformedOperation);
      this.operationHistory.push(transformedOperation);

      this.broadcastMessage({
        type: 'operation',
        from: 'system',
        data: {
          operation: transformedOperation,
          document: this.document
        },
        timestamp: Date.now(),
        messageId: crypto.randomUUID()
      });

      this.scheduleSave();
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  async handleSave(request: Request): Promise<Response> {
    await this.saveDocument();
    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  async handleSync(request: Request): Promise<Response> {
    return new Response(JSON.stringify({
      document: this.document,
      collaborators: this.getCollaboratorList()
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  private broadcastMessage(message: CollaborationMessage, excludeClientId?: string): void {
    for (const [clientId, collaborator] of this.collaborators.entries()) {
      if (clientId !== excludeClientId) {
        try {
          collaborator.websocket.send(JSON.stringify(message));
        } catch (error) {
          this.logger.error('Failed to send message to collaborator', {
            contentId: this.contentId,
            clientId,
            error
          });
          this.collaborators.delete(clientId);
        }
      }
    }
  }

  private getCollaboratorList(): Array<{clientId: string, userId: string, username: string, color: string, cursor: unknown, isTyping: boolean}> {
    return Array.from(this.collaborators.entries()).map(([clientId, collaborator]) => ({ _clientId,
      userId: collaborator.userId,
      username: collaborator.username,
      color: collaborator.color,
      cursor: collaborator.cursor,
      isTyping: collaborator.isTyping
    }));
  }

  private generateUserColor(userId: string): string {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
      '#F7DC6F', '#BB8FCE', '#85C1E9', '#F8C471', '#82E0AA'
    ];

    const hash = userId.split('').reduce((a, _b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);

    return colors[Math.abs(hash) % colors.length];
  }

  private scheduleSave(): void {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }

    // Save after 5 seconds of inactivity
    this.saveTimeout = setTimeout(() => {
      this.saveDocument();
    }, 5000);
  }

  private async saveDocument(): Promise<void> {
    try {
      // Save to durable object storage
      await this.state.storage.put('document', this.document);
      await this.state.storage.put('operationHistory', this.operationHistory.slice(-100)); // Keep last 100 operations

      // Optionally save to content service
      if (this.env.CONTENT_SERVICE) {
        await this.env.CONTENT_SERVICE.fetch(`http://internal/api/content/${this.contentId}/autosave`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: this.document.content,
            version: this.document.version,
            lastModified: this.document.lastModified
          })
        });
      }

      this.logger.info('Document saved', {
        contentId: this.contentId,
        version: this.document.version,
        contentLength: this.document.content.length
      });
    } catch (error) {
      this.logger.error('Failed to save document', {
        contentId: this.contentId,
        error: error instanceof Error ? error.message : error
      });
    }
  }

  private async loadPersistedState(): Promise<void> {
    try {
      const persistedDocument = await this.state.storage.get('document') as DocumentState;
      const persistedHistory = await this.state.storage.get('operationHistory') as Operation[];

      if (persistedDocument) {
        this.document = persistedDocument;
      }

      if (persistedHistory) {
        this.operationHistory = persistedHistory;
      }

      this.logger.info('Collaboration state loaded', {
        contentId: this.contentId,
        documentVersion: this.document.version,
        historyLength: this.operationHistory.length
      });
    } catch (error) {
      this.logger.error('Failed to load persisted state', {
        contentId: this.contentId,
        error: error instanceof Error ? error.message : error
      });
    }
  }
}