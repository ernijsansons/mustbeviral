/**
 * Cloudflare Service Types
 * Replaces 'any' types with proper type definitions for D1, KV, and R2
 */

// D1 Database Types
export interface D1QueryResult<T = DatabaseRecord> {
  results: T[];
  success: boolean;
  meta: D1QueryMeta;
  error?: string;
}

export interface DatabaseRecord {
  [key: string]: string | number | boolean | null | Date;
}

export interface D1QueryMeta {
  served_by: string;
  duration: number;
  changes: number;
  last_row_id: number;
  changed_db: boolean;
  size_after: number;
  rows_read: number;
  rows_written: number;
}

export interface D1ExecResult {
  count: number;
  duration: number;
}

// KV Storage Types
export interface KVGetOptions {
  type?: 'text' | 'json' | 'arrayBuffer' | 'stream';
  cacheTtl?: number;
}

export interface KVPutOptions {
  expiration?: number;
  expirationTtl?: number;
  metadata?: KVMetadata;
}

export interface KVMetadata {
  contentType?: string;
  createdBy?: string;
  version?: number;
  tags?: string[];
  [key: string]: unknown;
}

export interface KVListOptions {
  limit?: number;
  prefix?: string;
  cursor?: string;
}

export interface KVListResult {
  keys: KVKey[];
  list_complete: boolean;
  cursor?: string;
}

export interface KVKey {
  name: string;
  expiration?: number;
  metadata?: KVMetadata;
}

// R2 Storage Types
export interface R2Object {
  key: string;
  version: string;
  size: number;
  etag: string;
  httpEtag: string;
  uploaded: Date;
  checksums: R2Checksums;
  httpMetadata?: R2HTTPMetadata;
  customMetadata?: Record<string, string>;
}

export interface R2ObjectBody extends R2Object {
  body: ReadableStream<Uint8Array>;
  bodyUsed: boolean;
  arrayBuffer(): Promise<ArrayBuffer>;
  text(): Promise<string>;
  json<T = JsonValue>(): Promise<T>;
  blob(): Promise<Blob>;
}

export interface R2PutOptions {
  httpMetadata?: R2HTTPMetadata;
  customMetadata?: Record<string, string>;
  md5?: ArrayBuffer | string;
  sha1?: ArrayBuffer | string;
  sha256?: ArrayBuffer | string;
  sha384?: ArrayBuffer | string;
  sha512?: ArrayBuffer | string;
}

export interface R2HTTPMetadata {
  contentType?: string;
  contentLanguage?: string;
  contentDisposition?: string;
  contentEncoding?: string;
  cacheControl?: string;
  cacheExpiry?: Date;
}

export interface R2Checksums {
  md5?: ArrayBuffer;
  sha1?: ArrayBuffer;
  sha256?: ArrayBuffer;
  sha384?: ArrayBuffer;
  sha512?: ArrayBuffer;
}

export interface R2ListOptions {
  limit?: number;
  prefix?: string;
  cursor?: string;
  delimiter?: string;
  include?: ('httpMetadata' | 'customMetadata')[];
}

export interface R2Objects {
  objects: R2Object[];
  truncated: boolean;
  cursor?: string;
  delimitedPrefixes: string[];
}

// JSON value types for type safety
export type JsonValue = 
  | string 
  | number 
  | boolean 
  | null 
  | JsonObject 
  | JsonArray;

export interface JsonObject {
  [key: string]: JsonValue;
}

export interface JsonArray extends Array<JsonValue> {}

// Trends cache specific types
export interface TrendsData {
  trends: Trend[];
  metadata: TrendsMetadata;
  lastUpdated: string;
  source: string;
}

export interface Trend {
  id: string;
  name: string;
  volume: number;
  growth: number;
  category: string;
  platforms: PlatformTrend[];
  sentiment: SentimentData;
  demographics: DemographicData;
  timeData: TrendTimeData[];
}

export interface PlatformTrend {
  platform: string;
  volume: number;
  growth: number;
  engagement: number;
  reach: number;
}

export interface SentimentData {
  positive: number;
  neutral: number;
  negative: number;
  overall: 'positive' | 'neutral' | 'negative';
}

export interface DemographicData {
  ageGroups: Record<string, number>;
  genders: Record<string, number>;
  locations: Record<string, number>;
  interests: string[];
}

export interface TrendTimeData {
  timestamp: string;
  volume: number;
  growth: number;
  mentions: number;
}

export interface TrendsMetadata {
  totalTrends: number;
  timeframe: string;
  regions: string[];
  sources: string[];
  refreshRate: number;
  accuracy: number;
}

// Asset storage types
export interface AssetMetadata {
  userId: string;
  fileName: string;
  originalName: string;
  fileSize: number;
  contentType: string;
  uploadedAt: string;
  tags?: string[];
  description?: string;
  publicUrl?: string;
  thumbnailUrl?: string;
  processedVersions?: ProcessedVersion[];
}

export interface ProcessedVersion {
  type: 'thumbnail' | 'compressed' | 'resized' | 'converted';
  url: string;
  size: number;
  dimensions?: {
    width: number;
    height: number;
  };
  format: string;
  quality?: number;
}

// Service client types
export interface CloudflareClientOptions {
  timeout?: number;
  retries?: number;
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
  metrics?: boolean;
}

export interface HealthCheckResult {
  service: 'D1' | 'KV' | 'R2';
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime: number;
  error?: string;
  details?: Record<string, unknown>;
}

export interface ServiceMetrics {
  requests: number;
  errors: number;
  averageLatency: number;
  successRate: number;
  lastError?: string;
  lastErrorTime?: string;
}

// Error types
export interface CloudflareError {
  service: 'D1' | 'KV' | 'R2';
  operation: string;
  code: string;
  message: string;
  retryable: boolean;
  retryAfter?: number;
  details?: Record<string, unknown>;
}

// Configuration types
export interface CloudflareEnvironment {
  DB: D1Database;
  TRENDS_CACHE: KVNamespace;
  ASSETS_STORAGE: R2Bucket;
  JWT_SECRET: string;
  STRIPE_SECRET_KEY: string;
  API_BASE_URL?: string;
  ENVIRONMENT?: 'development' | 'staging' | 'production';
}

// Global Cloudflare types (declarations)
declare global {
  interface D1Database {
    prepare(query: string): D1PreparedStatement;
    batch(statements: D1PreparedStatement[]): Promise<D1Result[]>;
    exec(query: string): Promise<D1ExecResult>;
    dump(): Promise<ArrayBuffer>;
  }

  interface D1PreparedStatement {
    bind(...params: unknown[]): D1PreparedStatement;
    first<T = DatabaseRecord>(): Promise<T | null>;
    run(): Promise<D1Result>;
    all<T = DatabaseRecord>(): Promise<D1Result<T>>;
  }

  interface D1Result<T = DatabaseRecord> {
    results: T[];
    success: boolean;
    meta: D1QueryMeta;
    error?: string;
  }

  interface KVNamespace {
    get(key: string, options?: KVGetOptions): Promise<string | ArrayBuffer | ReadableStream | null>;
    put(key: string, value: string | ArrayBuffer | ReadableStream, options?: KVPutOptions): Promise<void>;
    delete(key: string): Promise<void>;
    list(options?: KVListOptions): Promise<KVListResult>;
    getWithMetadata<T = JsonValue>(key: string, options?: KVGetOptions): Promise<{ value: T | null; metadata: KVMetadata | null }>;
  }

  interface R2Bucket {
    get(key: string): Promise<R2ObjectBody | null>;
    put(key: string, value: ArrayBuffer | ReadableStream | string, options?: R2PutOptions): Promise<R2Object | null>;
    delete(key: string): Promise<void>;
    list(options?: R2ListOptions): Promise<R2Objects>;
    head(key: string): Promise<R2Object | null>;
  }
}

// Utility types for type safety
export type D1QueryExecutor = <T extends DatabaseRecord>(
  query: string,
  params?: unknown[]
) => Promise<D1QueryResult<T>>;

export type KVGetOperation = <T extends JsonValue>(
  key: string,
  options?: KVGetOptions
) => Promise<T | null>;

export type KVPutOperation = <T extends JsonValue>(
  key: string,
  value: T,
  options?: KVPutOptions
) => Promise<void>;

export type R2GetOperation = (key: string) => Promise<R2ObjectBody | null>;

export type R2PutOperation = (
  key: string,
  value: ArrayBuffer | ReadableStream | string,
  options?: R2PutOptions
) => Promise<R2Object | null>;