// Type definitions for third-party libraries and vendor code
// These help replace 'unknown' types when working with external dependencies

// Cloudflare Worker types
export interface CloudflareEnv {
  KV: KVNamespace;
  DB?: D1Database;
  R2?: R2Bucket;
  QUEUE?: Queue;
  AI?: unknown;
  JWT_SECRET?: string;
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  [key: string]: unknown;
}

export interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

// KV Store types
export interface KVNamespace {
  get(key: string): Promise<string | null>;
  get(key: string, type: 'json'): Promise<unknown | null>;
  get(key: string, type: 'text'): Promise<string | null>;
  get(key: string, type: 'arrayBuffer'): Promise<ArrayBuffer | null>;
  get(key: string, type: 'stream'): Promise<ReadableStream | null>;
  put(key: string, value: string | ArrayBuffer | ReadableStream, options?: KVPutOptions): Promise<void>;
  delete(key: string): Promise<void>;
  list(options?: KVListOptions): Promise<KVListResult>;
}

export interface KVPutOptions {
  expiration?: number;
  expirationTtl?: number;
  metadata?: Record<string, unknown>;
}

export interface KVListOptions {
  prefix?: string;
  limit?: number;
  cursor?: string;
}

export interface KVListResult {
  keys: Array<{ name: string; metadata?: Record<string, unknown> }>;
  list_complete: boolean;
  cursor?: string;
}

// D1 Database types
export interface D1Database {
  prepare(query: string): D1PreparedStatement;
  dump(): Promise<ArrayBuffer>;
  exec<T = unknown>(query: string): Promise<D1Result<T>>;
  batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]>;
}

export interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = unknown>(colName?: string): Promise<T | null>;
  run<T = unknown>(): Promise<D1Result<T>>;
  all<T = unknown>(): Promise<D1Result<T>>;
}

export interface D1Result<T = unknown> {
  results: T[];
  success: boolean;
  error?: string;
  meta?: {
    duration: number;
    rows_read: number;
    rows_written: number;
  };
}

// R2 Storage types
export interface R2Bucket {
  put(key: string, value: ReadableStream | ArrayBuffer | string, options?: R2PutOptions): Promise<R2Object>;
  get(key: string): Promise<R2Object | null>;
  delete(key: string): Promise<void>;
  list(options?: R2ListOptions): Promise<R2Objects>;
}

export interface R2Object {
  key: string;
  version: string;
  size: number;
  etag: string;
  httpMetadata?: Record<string, string>;
  customMetadata?: Record<string, string>;
  body?: ReadableStream;
  arrayBuffer(): Promise<ArrayBuffer>;
  text(): Promise<string>;
  json<T = unknown>(): Promise<T>;
}

export interface R2PutOptions {
  httpMetadata?: Record<string, string>;
  customMetadata?: Record<string, string>;
}

export interface R2ListOptions {
  prefix?: string;
  cursor?: string;
  delimiter?: string;
  limit?: number;
}

export interface R2Objects {
  objects: R2Object[];
  truncated: boolean;
  cursor?: string;
  delimitedPrefixes?: string[];
}

// Queue types
export interface Queue {
  send(message: unknown, options?: QueueSendOptions): Promise<void>;
  sendBatch(messages: Array<{ body: unknown; options?: QueueSendOptions }>): Promise<void>;
}

export interface QueueSendOptions {
  delaySeconds?: number;
}

// WebSocket types
export interface WebSocketMessage {
  type: string;
  payload?: unknown;
  id?: string;
  timestamp?: number;
}

export interface WebSocketConnection {
  accept(): void;
  send(message: string | ArrayBuffer): void;
  close(code?: number, reason?: string): void;
  addEventListener(event: 'message' | 'close' | 'error', handler: (event: unknown) => void): void;
}

// AI Model types (for Cloudflare AI)
export interface AIModelResponse {
  response?: string;
  confidence?: number;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// Stripe types (basic)
export interface StripeCustomer {
  id: string;
  email?: string;
  name?: string;
  metadata?: Record<string, string>;
}

export interface StripePaymentIntent {
  id: string;
  amount: number;
  currency: string;
  status: string;
  customer?: string;
  metadata?: Record<string, string>;
}

export interface StripeSubscription {
  id: string;
  customer: string;
  status: string;
  current_period_end: number;
  items: {
    data: Array<{
      price: {
        id: string;
        product: string;
        unit_amount: number;
      };
    }>;
  };
}

// React Query types
export interface QueryOptions<T = unknown> {
  queryKey: unknown[];
  queryFn: () => Promise<T>;
  enabled?: boolean;
  retry?: number | boolean;
  retryDelay?: number;
  staleTime?: number;
  cacheTime?: number;
}

export interface MutationOptions<TData = unknown, TVariables = unknown> {
  mutationFn: (variables: TVariables) => Promise<TData>;
  onSuccess?: (data: TData) => void;
  onError?: (error: Error) => void;
}

// Chart.js types (basic)
export interface ChartData {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    backgroundColor?: string | string[];
    borderColor?: string | string[];
  }>;
}

export interface ChartOptions {
  responsive?: boolean;
  maintainAspectRatio?: boolean;
  scales?: Record<string, unknown>;
  plugins?: Record<string, unknown>;
}