// Operational Transform Operation Types
// Defines the core operation types for collaborative editing with OT

export interface VectorClock {
  [userId: string]: number;
}

export interface OperationMetadata {
  operationId: string;
  userId: string;
  sessionId: string;
  timestamp: number;
  vectorClock: VectorClock;
  documentVersion: number;
  parentOperationId?: string;
}

// Base operation interface
export interface BaseOperation {
  type: 'insert' | 'delete' | 'retain' | 'format';
  metadata: OperationMetadata;
}

// Insert operation - inserts text at a position
export interface InsertOperation extends BaseOperation {
  type: 'insert';
  position: number;
  content: string;
  attributes?: TextAttributes;
}

// Delete operation - deletes text from a position
export interface DeleteOperation extends BaseOperation {
  type: 'delete';
  position: number;
  length: number;
  deletedContent?: string; // For undo functionality
}

// Retain operation - keeps existing text unchanged (used for formatting)
export interface RetainOperation extends BaseOperation {
  type: 'retain';
  position: number;
  length: number;
  attributes?: TextAttributes;
}

// Format operation - applies formatting to existing text
export interface FormatOperation extends BaseOperation {
  type: 'format';
  position: number;
  length: number;
  attributes: TextAttributes;
  oldAttributes?: TextAttributes; // For undo functionality
}

// Union type for all operations
export type Operation = InsertOperation | DeleteOperation | RetainOperation | FormatOperation;

// Text formatting attributes
export interface TextAttributes {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  fontSize?: number;
  fontFamily?: string;
  color?: string;
  backgroundColor?: string;
  link?: string;
  heading?: 1 | 2 | 3 | 4 | 5 | 6;
  align?: 'left' | 'center' | 'right' | 'justify';
  listType?: 'bullet' | 'number' | 'checkbox';
  listLevel?: number;
}

// Document state represents the current document
export interface DocumentState {
  id: string;
  content: string;
  version: number;
  checksum: string;
  lastModified: number;
  formatting: FormattingMap;
  metadata: {
    title?: string;
    author?: string;
    collaborators: string[];
    permissions: DocumentPermissions;
  };
}

// Formatting map for tracking text attributes
export interface FormattingMap {
  [position: number]: TextAttributes;
}

// Document permissions
export interface DocumentPermissions {
  read: string[];
  write: string[];
  admin: string[];
  owner: string;
}

// Operation result after transformation
export interface TransformResult {
  transformed: Operation;
  inverse?: Operation; // For undo functionality
  applied: boolean;
  conflicts?: ConflictInfo[];
}

// Conflict information
export interface ConflictInfo {
  type: 'concurrent_edit' | 'position_shift' | 'format_conflict' | 'deletion_conflict';
  description: string;
  originalOperation: Operation;
  conflictingOperation: Operation;
  resolution: 'auto_resolved' | 'manual_required';
}

// Selection and cursor information
export interface Selection {
  start: number;
  end: number;
  direction?: 'forward' | 'backward';
}

export interface CursorPosition {
  userId: string;
  position: number;
  selection?: Selection;
  timestamp: number;
  color: string;
}

// Collaborative editing session
export interface CollaborationSession {
  sessionId: string;
  documentId: string;
  participants: SessionParticipant[];
  documentState: DocumentState;
  operationHistory: Operation[];
  activeOperations: Map<string, Operation>; // Operations being processed
  cursors: Map<string, CursorPosition>;
  created: number;
  lastActivity: number;
  maxParticipants: number;
  settings: SessionSettings;
}

export interface SessionParticipant {
  userId: string;
  username: string;
  role: 'owner' | 'editor' | 'viewer';
  color: string;
  joinedAt: number;
  lastSeen: number;
  status: 'active' | 'idle' | 'away';
  permissions: ParticipantPermissions;
}

export interface ParticipantPermissions {
  canEdit: boolean;
  canComment: boolean;
  canInvite: boolean;
  canManagePermissions: boolean;
}

export interface SessionSettings {
  maxConcurrentOperations: number;
  operationTimeout: number;
  autoSaveInterval: number;
  conflictResolutionStrategy: 'client_wins' | 'server_wins' | 'merge' | 'manual';
  enableRealTimeCursors: boolean;
  enableOperationHistory: boolean;
  maxHistorySize: number;
  compressionEnabled: boolean;
}

// Operation validation
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  code: string;
  message: string;
  field?: string;
  severity: 'error' | 'warning';
}

export interface ValidationWarning {
  code: string;
  message: string;
  suggestion?: string;
}

// Operational Transform specific types
export interface TransformPair {
  op1: Operation;
  op2: Operation;
  transformed1: Operation;
  transformed2: Operation;
  priority: 'op1' | 'op2' | 'equal';
}

export interface OperationContext {
  documentState: DocumentState;
  precedingOperations: Operation[];
  concurrentOperations: Operation[];
  userContext: {
    userId: string;
    permissions: ParticipantPermissions;
  };
}

// Undo/Redo functionality
export interface UndoRedoState {
  undoStack: Operation[];
  redoStack: Operation[];
  maxStackSize: number;
  currentVersion: number;
}

// Event types for collaboration
export type CollaborationEventType =
  | 'operation_applied'
  | 'operation_transformed'
  | 'operation_rejected'
  | 'cursor_updated'
  | 'participant_joined'
  | 'participant_left'
  | 'document_saved'
  | 'conflict_detected'
  | 'conflict_resolved'
  | 'synchronization_complete'
  | 'synchronization_failed';

export interface CollaborationEvent {
  type: CollaborationEventType;
  sessionId: string;
  userId?: string;
  timestamp: number;
  data: any;
  metadata?: {
    operationId?: string;
    conflictId?: string;
    errorCode?: string;
  };
}

// Utility types for type safety
export type OperationType = Operation['type'];
export type OperationByType<T extends OperationType> = Extract<Operation, { type: T }>;

// Position utilities
export interface PositionRange {
  start: number;
  end: number;
}

export interface PositionMapping {
  original: number;
  transformed: number;
  operation: Operation;
}

// Error types
export class OperationError extends Error {
  constructor(
    message: string,
    public code: string,
    public operation?: Operation,
    public context?: OperationContext
  ) {
    super(message);
    this.name = 'OperationError';
  }
}

export class TransformError extends Error {
  constructor(
    message: string,
    public op1: Operation,
    public op2: Operation,
    public context?: OperationContext
  ) {
    super(message);
    this.name = 'TransformError';
  }
}

export class ValidationError extends Error {
  constructor(
    message: string,
    public validationResult: ValidationResult,
    public operation?: Operation
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

// Constants
export const OPERATION_DEFAULTS = {
  MAX_CONTENT_LENGTH: 50000,
  MAX_OPERATION_SIZE: 10000,
  MAX_CONCURRENT_OPERATIONS: 100,
  OPERATION_TIMEOUT: 30000,
  MAX_HISTORY_SIZE: 1000,
  AUTO_SAVE_INTERVAL: 10000,
  CURSOR_UPDATE_THROTTLE: 100,
  SYNC_INTERVAL: 5000,
} as const;

export const CONFLICT_PRIORITIES = {
  INSERT_OVER_DELETE: 1,
  DELETE_OVER_FORMAT: 1,
  FORMAT_MERGE: 1,
  CLIENT_TIMESTAMP: 1,
  USER_ID_FALLBACK: 1,
} as const;

// Helper type guards
export function isInsertOperation(op: Operation): op is InsertOperation {
  return op.type === 'insert';
}

export function isDeleteOperation(op: Operation): op is DeleteOperation {
  return op.type === 'delete';
}

export function isRetainOperation(op: Operation): op is RetainOperation {
  return op.type === 'retain';
}

export function isFormatOperation(op: Operation): op is FormatOperation {
  return op.type === 'format';
}

// Utility functions for operations
export function createOperationId(): string {
  return `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function createSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function generateUserColor(userId: string): string {
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
    '#F7DC6F', '#BB8FCE', '#85C1E9', '#F8C471', '#82E0AA',
    '#AED6F1', '#F1948A', '#85C1E9', '#F8D7DA', '#D1F2EB'
  ];

  const hash = userId.split('').reduce((a, b) => {
    a = ((a << 5) - a) + b.charCodeAt(0);
    return a & a;
  }, 0);

  return colors[Math.abs(hash) % colors.length];
}

export function calculateChecksum(content: string): string {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash.toString(36);
}

export function compareVectorClocks(clock1: VectorClock, clock2: VectorClock): 'before' | 'after' | 'concurrent' | 'equal' {
  const allUsers = new Set([...Object.keys(clock1), ...Object.keys(clock2)]);
  let hasGreater = false;
  let hasLess = false;

  for (const userId of allUsers) {
    const time1 = clock1[userId] || 0;
    const time2 = clock2[userId] || 0;

    if (time1 > time2) {
      hasGreater = true;
    } else if (time1 < time2) {
      hasLess = true;
    }
  }

  if (hasGreater && hasLess) {
    return 'concurrent';
  } else if (hasGreater) {
    return 'after';
  } else if (hasLess) {
    return 'before';
  } else {
    return 'equal';
  }
}