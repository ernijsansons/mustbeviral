export interface DomainEvent {
  id: string;
  type: string;
  aggregateId: string;
  aggregateVersion: number;
  timestamp: number;
  data: Record<string, unknown>;
  metadata: EventMetadata;
  causedBy?: string;
  correlationId?: string;
}

export interface EventMetadata {
  source: string;
  userId?: string;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
  traceId?: string;
  spanId?: string;
  version: string;
  schema: string;
}

export interface EventStream {
  aggregateId: string;
  aggregateType: string;
  version: number;
  events: DomainEvent[];
  snapshot?: Snapshot;
  lastModified: number;
}

export interface Snapshot {
  id: string;
  aggregateId: string;
  aggregateType: string;
  version: number;
  data: Record<string, unknown>;
  timestamp: number;
  metadata: SnapshotMetadata;
}

export interface SnapshotMetadata {
  reason: 'periodic' | 'size_threshold' | 'manual';
  eventCount: number;
  compressedSize: number;
  checksum: string;
}

export interface EventStoreConfig {
  snapshotFrequency: number;
  maxEventsPerStream: number;
  enableCompression: boolean;
  enableEncryption: boolean;
  retentionPolicy: RetentionPolicy;
  replicationFactor: number;
  consistencyLevel: 'eventual' | 'strong';
}

export interface RetentionPolicy {
  maxAge: number;
  maxEvents: number;
  archiveOldEvents: boolean;
  deleteAfterArchive: boolean;
}

export interface ProjectionConfig {
  name: string;
  eventTypes: string[];
  buildFromSnapshot: boolean;
  rebuildOnStart: boolean;
  batchSize: number;
  checkpointFrequency: number;
}

export interface ReadModel {
  id: string;
  version: number;
  data: Record<string, unknown>;
  lastUpdated: number;
  projectionVersion: number;
}

export interface EventQuery {
  aggregateId?: string;
  aggregateType?: string;
  eventTypes?: string[];
  fromVersion?: number;
  toVersion?: number;
  fromTimestamp?: number;
  toTimestamp?: number;
  limit?: number;
  correlationId?: string;
  causedBy?: string;
}

export interface Subscription {
  id: string;
  name: string;
  eventTypes: string[];
  startPosition: 'beginning' | 'end' | number;
  handler: EventHandler;
  filterPredicate?: (event: DomainEvent) => boolean;
  batchSize: number;
  maxRetries: number;
  deadLetterQueue: boolean;
  status: 'active' | 'paused' | 'stopped' | 'error';
  position: number;
  lastProcessed: number;
  errorCount: number;
}

export interface EventHandler {
  handle(events: DomainEvent[]): Promise<void>;
  onError?(error: Error, event: DomainEvent): Promise<void>;
}

export interface Saga {
  id: string;
  type: string;
  status: 'active' | 'completed' | 'failed' | 'compensating';
  currentStep: string;
  data: Record<string, unknown>;
  startedAt: number;
  completedAt?: number;
  timeout?: number;
  compensationEvents: DomainEvent[];
  steps: SagaStep[];
}

export interface SagaStep {
  name: string;
  command: Command;
  compensation?: Command;
  timeout?: number;
  retries: number;
  status: 'pending' | 'executing' | 'completed' | 'failed' | 'compensated';
}

export interface Command {
  type: string;
  aggregateId: string;
  data: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface CommandResult {
  success: boolean;
  events: DomainEvent[];
  error?: string;
}

export interface EventStoreMetrics {
  totalEvents: number;
  eventsPerSecond: number;
  averageEventSize: number;
  storageSize: number;
  activeStreams: number;
  snapshotCount: number;
  projectionCount: number;
  subscriptionCount: number;
  replicationLag: number;
}

export class EventStore {
  private streams: Map<string, EventStream> = new Map();
  private snapshots: Map<string, Snapshot> = new Map();
  private globalEventLog: DomainEvent[] = [];
  private subscriptions: Map<string, Subscription> = new Map();
  private projections: Map<string, Projection> = new Map();
  private sagas: Map<string, Saga> = new Map();
  private eventHandlers: Map<string, EventHandler[]> = new Map();

  constructor(private config: EventStoreConfig) {
    this.startSubscriptionProcessing();
    this.startSnapshotManagement();
    this.startRetentionManagement();
  }

  async appendEvents(
    aggregateId: string,
    aggregateType: string,
    events: Omit<DomainEvent, 'id' | 'aggregateId' | 'aggregateVersion' | 'timestamp'>[],
    expectedVersion?: number
  ): Promise<void> {
    const streamKey = `${aggregateType}:${aggregateId}`;
    let stream = this.streams.get(streamKey);

    if (!stream) {
      stream = { aggregateId,
        aggregateType,
        version: 0,
        events: [],
        lastModified: Date.now()
      };
    }

    if (expectedVersion !== undefined && stream.version !== expectedVersion) {
      throw new Error(`Concurrency conflict: expected version ${expectedVersion}, actual version ${stream.version}`);
    }

    const enrichedEvents = events.map((event, index) => ({
      ...event,
      id: this.generateEventId(),
      aggregateId,
      aggregateVersion: stream!.version + index + 1,
      timestamp: Date.now()
    }));

    stream.events.push(...enrichedEvents);
    stream.version += enrichedEvents.length;
    stream.lastModified = Date.now();

    this.streams.set(streamKey, stream);
    this.globalEventLog.push(...enrichedEvents);

    await this.processEvents(enrichedEvents);
    await this.checkSnapshotThreshold(stream);
  }

  async getEvents(query: EventQuery): Promise<DomainEvent[]> {
    let events = this.globalEventLog;

    if (query.aggregateId && query.aggregateType) {
      const streamKey = `${query.aggregateType}:${query.aggregateId}`;
      const stream = this.streams.get(streamKey);
      events = stream?.events ?? [];
    } else if (query.aggregateType) {
      events = this.globalEventLog.filter(e =>
        e.aggregateId.startsWith(`${query.aggregateType}:`)
      );
    }

    if (query.eventTypes) {
      events = events.filter(e => query.eventTypes!.includes(e.type));
    }

    if (query.fromVersion !== undefined) {
      events = events.filter(e => e.aggregateVersion >= query.fromVersion!);
    }

    if (query.toVersion !== undefined) {
      events = events.filter(e => e.aggregateVersion <= query.toVersion!);
    }

    if (query.fromTimestamp !== undefined) {
      events = events.filter(e => e.timestamp >= query.fromTimestamp!);
    }

    if (query.toTimestamp !== undefined) {
      events = events.filter(e => e.timestamp <= query.toTimestamp!);
    }

    if (query.correlationId) {
      events = events.filter(e => e.correlationId === query.correlationId);
    }

    if (query.causedBy) {
      events = events.filter(e => e.causedBy === query.causedBy);
    }

    if (query.limit) {
      events = events.slice(0, query.limit);
    }

    return events;
  }

  async getAggregate<T>(
    aggregateId: string,
    aggregateType: string,
    toVersion?: number
  ): Promise<T | null> {
    const streamKey = `${aggregateType}:${aggregateId}`;
    const stream = this.streams.get(streamKey);

    if (!stream) {
    return null;
  }

    let events = stream.events;
    if (toVersion !== undefined) {
      events = events.filter(e => e.aggregateVersion <= toVersion);
    }

    let state: unknown = {};

    const snapshot = stream.snapshot;
    if (snapshot && (!toVersion || snapshot.version <= toVersion)) {
      state = snapshot.data;
      events = events.filter(e => e.aggregateVersion > snapshot.version);
    }

    for (const event of events) {
      state = this.applyEvent(state, event);
    }

    return state as T;
  }

  async createSnapshot(aggregateId: string, aggregateType: string): Promise<void> {
    const aggregate = await this.getAggregate(aggregateId, aggregateType);
    if (!aggregate) {return;}

    const streamKey = `${aggregateType}:${aggregateId}`;
    const stream = this.streams.get(streamKey);
    if (!stream) {return;}

    const snapshot: Snapshot = {
      id: this.generateSnapshotId(),
      aggregateId,
      aggregateType,
      version: stream.version,
      data: aggregate as Record<string, unknown>,
      timestamp: Date.now(),
      metadata: {
        reason: 'manual',
        eventCount: stream.events.length,
        compressedSize: JSON.stringify(aggregate).length,
        checksum: this.calculateChecksum(aggregate)
      }
    };

    stream.snapshot = snapshot;
    this.snapshots.set(snapshot.id, snapshot);
    this.streams.set(streamKey, stream);

    await this.trimEvents(stream);
  }

  async subscribe(subscription: Omit<Subscription, 'id' | 'position' | 'lastProcessed' | 'errorCount'>): Promise<string> {
    const subscriptionId = this.generateSubscriptionId();
    const fullSubscription: Subscription = {
      ...subscription,
      id: subscriptionId,
      position: subscription.startPosition === 'beginning' ? 0 :
                subscription.startPosition === 'end' ? this.globalEventLog.length :
                subscription.startPosition,
      lastProcessed: Date.now(),
      errorCount: 0
    };

    this.subscriptions.set(subscriptionId, fullSubscription);
    return subscriptionId;
  }

  async unsubscribe(subscriptionId: string): Promise<void> {
    this.subscriptions.delete(subscriptionId);
  }

  async createProjection(config: ProjectionConfig): Promise<void> {
    const projection = new Projection(config, this);
    this.projections.set(config.name, projection);

    if (config.buildFromSnapshot) {
      await projection.rebuildFromSnapshots();
    } else if (config.rebuildOnStart) {
      await projection.rebuild();
    }
  }

  async getReadModel(projectionName: string, id: string): Promise<ReadModel | null> {
    const projection = this.projections.get(projectionName);
    return projection ? projection.getReadModel(id) : null;
  }

  async queryReadModels(
    projectionName: string,
    query: Record<string, unknown>
  ): Promise<ReadModel[]> {
    const projection = this.projections.get(projectionName);
    return projection ? projection.query(query) : [];
  }

  async startSaga(sagaType: string, data: Record<string, unknown>, steps: SagaStep[]): Promise<string> {
    const sagaId = this.generateSagaId();
    const saga: Saga = {
      id: sagaId,
      type: sagaType,
      status: 'active',
      currentStep: steps[0]?.name ?? '',
      data,
      startedAt: Date.now(),
      compensationEvents: [],
      steps
    };

    this.sagas.set(sagaId, saga);
    await this.executeSagaStep(saga);
    return sagaId;
  }

  async getSaga(sagaId: string): Promise<Saga | null> {
    return this.sagas.get(sagaId)  ?? null;
  }

  async registerEventHandler(eventType: string, handler: EventHandler): Promise<void> {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, []);
    }
    this.eventHandlers.get(eventType)!.push(handler);
  }

  async replay(
    fromTimestamp: number,
    toTimestamp?: number,
    eventTypes?: string[]
  ): Promise<void> {
    const query: EventQuery = { fromTimestamp,
      toTimestamp,
      eventTypes
    };

    const events = await this.getEvents(query);
    await this.processEvents(events);
  }

  getMetrics(): EventStoreMetrics {
    const totalEvents = this.globalEventLog.length;
    const avgEventSize = totalEvents > 0
      ? this.globalEventLog.reduce((sum, e) => sum + JSON.stringify(e).length, 0) / totalEvents
      : 0;

    return { totalEvents,
      eventsPerSecond: this.calculateEventsPerSecond(),
      averageEventSize: avgEventSize,
      storageSize: this.calculateStorageSize(),
      activeStreams: this.streams.size,
      snapshotCount: this.snapshots.size,
      projectionCount: this.projections.size,
      subscriptionCount: this.subscriptions.size,
      replicationLag: 0
    };
  }

  private async processEvents(events: DomainEvent[]): Promise<void> {
    for (const event of events) {
      const handlers = this.eventHandlers.get(event.type)  ?? [];

      await Promise.all(handlers.map(async handler => {
        try {
          await handler.handle([event]);
        } catch (error: unknown) {
          if (handler.onError) {
            await handler.onError(error as Error, event);
          }
        }
      }));

      await this.updateProjections(event);
      await this.processSagas(event);
    }
  }

  private async updateProjections(event: DomainEvent): Promise<void> {
    for (const projection of this.projections.values()) {
      if (projection.handlesEvent(event.type)) {
        await projection.processEvent(event);
      }
    }
  }

  private async processSagas(event: DomainEvent): Promise<void> {
    for (const saga of this.sagas.values()) {
      if (saga.status === 'active' && this.sagaHandlesEvent(saga, event)) {
        await this.updateSaga(saga, event);
      }
    }
  }

  private sagaHandlesEvent(saga: Saga, event: DomainEvent): boolean {
    const currentStep = saga.steps.find(s => s.name === saga.currentStep);
    return currentStep?.command.type === event.type;
  }

  private async updateSaga(saga: Saga, _event: DomainEvent): Promise<void> {
    const currentStepIndex = saga.steps.findIndex(s => s.name === saga.currentStep);
    if (currentStepIndex === -1) {return;}

    const currentStep = saga.steps[currentStepIndex];
    currentStep.status = 'completed';

    if (currentStepIndex === saga.steps.length - 1) {
      saga.status = 'completed';
      saga.completedAt = Date.now();
    } else {
      saga.currentStep = saga.steps[currentStepIndex + 1].name;
      await this.executeSagaStep(saga);
    }

    this.sagas.set(saga.id, saga);
  }

  private async executeSagaStep(saga: Saga): Promise<void> {
    const step = saga.steps.find(s => s.name === saga.currentStep);
    if (!step) {return;}

    step.status = 'executing';

    try {
      const result = await this.executeCommand(step.command);
      if (result.success) {
        step.status = 'completed';
      } else {
        throw new Error(result.error);
      }
    } catch (_error: unknown) {
      step.status = 'failed';
      saga.status = 'failed';

      if (step.compensation) {
        await this.compensateSaga(saga);
      }
    }
  }

  private async compensateSaga(saga: Saga): Promise<void> {
    saga.status = 'compensating';

    const completedSteps = saga.steps.filter(s => s.status === 'completed').reverse();

    for (const step of completedSteps) {
      if (step.compensation) {
        try {
          await this.executeCommand(step.compensation);
          step.status = 'compensated';
        } catch (error: unknown) {
          console.error(`Failed to compensate step ${step.name}:`, error);
        }
      }
    }

    saga.status = 'failed';
  }

  private async executeCommand(_command: Command): Promise<CommandResult> {
    return {
      success: true,
      events: [],
      error: undefined
    };
  }

  private applyEvent(state: unknown, event: DomainEvent): unknown {
    return { ...state, ...event.data };
  }

  private async checkSnapshotThreshold(stream: EventStream): Promise<void> {
    if (stream.events.length >= this.config.snapshotFrequency) {
      await this.createSnapshot(stream.aggregateId, stream.aggregateType);
    }
  }

  private async trimEvents(stream: EventStream): Promise<void> {
    if (stream.snapshot) {
      stream.events = stream.events.filter(e => e.aggregateVersion > stream.snapshot!.version);
    }
  }

  private startSubscriptionProcessing(): void {
    setInterval_(() => {
      this.processSubscriptions();
    }, 1000);
  }

  private startSnapshotManagement(): void {
    setInterval_(() => {
      this.manageSnapshots();
    }, 60000); // Every minute
  }

  private startRetentionManagement(): void {
    setInterval_(() => {
      this.applyRetentionPolicy();
    }, 3600000); // Every hour
  }

  private async processSubscriptions(): Promise<void> {
    for (const subscription of this.subscriptions.values()) {
      if (subscription.status !== 'active') {
    continue;
  }

      try {
        await this.processSubscription(subscription);
      } catch (_error: unknown) {
        subscription.errorCount++;
        if (subscription.errorCount >= subscription.maxRetries) {
          subscription.status = 'error';
        }
      }
    }
  }

  private async processSubscription(subscription: Subscription): Promise<void> {
    const events = this.globalEventLog.slice(subscription.position, subscription.position + subscription.batchSize);

    let filteredEvents = events.filter(e => subscription.eventTypes.includes(e.type));

    if (subscription.filterPredicate) {
      filteredEvents = filteredEvents.filter(subscription.filterPredicate);
    }

    if (filteredEvents.length > 0) {
      await subscription.handler.handle(filteredEvents);
      subscription.position += events.length;
      subscription.lastProcessed = Date.now();
      subscription.errorCount = 0;
    }
  }

  private async manageSnapshots(): Promise<void> {
    for (const stream of this.streams.values()) {
      if (stream.events.length >= this.config.snapshotFrequency && !stream.snapshot) {
        await this.createSnapshot(stream.aggregateId, stream.aggregateType);
      }
    }
  }

  private async applyRetentionPolicy(): Promise<void> {
    const cutoffTime = Date.now() - this.config.retentionPolicy.maxAge;

    this.globalEventLog = this.globalEventLog.filter(e => e.timestamp > cutoffTime);

    for (const [key, stream] of this.streams.entries()) {
      stream.events = stream.events.filter(e => e.timestamp > cutoffTime);
      if (stream.events.length === 0 && !stream.snapshot) {
        this.streams.delete(key);
      }
    }
  }

  private calculateEventsPerSecond(): number {
    const lastMinute = Date.now() - 60000;
    const recentEvents = this.globalEventLog.filter(e => e.timestamp > lastMinute);
    return recentEvents.length / 60;
  }

  private calculateStorageSize(): number {
    return JSON.stringify(Array.from(this.streams.values())).length;
  }

  private calculateChecksum(data: unknown): string {
    return JSON.stringify(data).length.toString();
  }

  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }

  private generateSnapshotId(): string {
    return `snap_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }

  private generateSubscriptionId(): string {
    return `sub_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }

  private generateSagaId(): string {
    return `saga_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }
}

export class Projection {
  private readModels: Map<string, ReadModel> = new Map();
  private checkpoint: number = 0;

  constructor(
    private config: ProjectionConfig,
    private eventStore: EventStore
  ) {}

  async processEvent(event: DomainEvent): Promise<void> {
    if (!this.handlesEvent(event.type)) {return;}

    const readModel = await this.projectEvent(event);
    if (readModel) {
      this.readModels.set(readModel.id, readModel);
    }

    this.checkpoint = event.aggregateVersion;

    if (this.checkpoint % this.config.checkpointFrequency === 0) {
      await this.saveCheckpoint();
    }
  }

  handlesEvent(eventType: string): boolean {
    return this.config.eventTypes.includes(eventType);
  }

  async rebuild(): Promise<void> {
    this.readModels.clear();
    this.checkpoint = 0;

    const events = await this.eventStore.getEvents({
      eventTypes: this.config.eventTypes
    });

    for (const event of events) {
      await this.processEvent(event);
    }
  }

  async rebuildFromSnapshots(): Promise<void> {
    // Implementation for rebuilding from snapshots
  }

  getReadModel(id: string): ReadModel | null {
    return this.readModels.get(id)  ?? null;
  }

  query(query: Record<string, unknown>): ReadModel[] {
    return Array.from(this.readModels.values()).filter(rm => {
      return Object.entries(query).every(([key, value]) => {
        return rm.data[key] === value;
      });
    });
  }

  private async projectEvent(event: DomainEvent): Promise<ReadModel | null> {
    const existingModel = this.readModels.get(event.aggregateId);

    const readModel: ReadModel = {
      id: event.aggregateId,
      version: event.aggregateVersion,
      data: existingModel ? { ...existingModel.data, ...event.data } : event.data,
      lastUpdated: event.timestamp,
      projectionVersion: this.checkpoint + 1
    };

    return readModel;
  }

  private async saveCheckpoint(): Promise<void> {
    // Save checkpoint to persistent storage
  }
}

export const createEventStore = (config: Partial<EventStoreConfig> = {}): EventStore => {
  const defaultConfig: EventStoreConfig = {
    snapshotFrequency: 100,
    maxEventsPerStream: 10000,
    enableCompression: false,
    enableEncryption: false,
    retentionPolicy: {
      maxAge: 365 * 24 * 60 * 60 * 1000, // 1 year
      maxEvents: 1000000,
      archiveOldEvents: true,
      deleteAfterArchive: false
    },
    replicationFactor: 1,
    consistencyLevel: 'strong'
  };

  return new EventStore({ ...defaultConfig, ...config });
};