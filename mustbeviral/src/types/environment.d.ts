/**
 * Environment and Runtime Type Definitions
 * Provides comprehensive type safety for environment variables and runtime contexts
 */

// Cloudflare Workers Environment Types
export interface CloudflareEnvironment {
  // KV Namespaces
  KV?: KVNamespace;
  CACHE?: KVNamespace;
  SESSIONS?: KVNamespace;
  
  // Durable Objects
  WEBSOCKET_ROOM?: DurableObjectNamespace;
  COLLABORATION_ROOM?: DurableObjectNamespace;
  
  // R2 Buckets
  ASSETS?: R2Bucket;
  UPLOADS?: R2Bucket;
  
  // D1 Database
  DB?: D1Database;
  
  // Service Bindings
  AI?: AIBinding;
  ANALYTICS?: AnalyticsEngine;
  
  // Environment Variables
  NODE_ENV: 'development' | 'production' | 'test';
  API_URL: string;
  JWT_SECRET: string;
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  OPENAI_API_KEY?: string;
  ANTHROPIC_API_KEY?: string;
  
  // Feature Flags
  ENABLE_AI_AGENTS?: boolean;
  ENABLE_WEBSOCKETS?: boolean;
  ENABLE_ANALYTICS?: boolean;
}

// AI Provider Types
export interface AIBinding {
  run(model: string, options: AIRunOptions): Promise<AIResponse>;
  listModels(): Promise<string[]>;
}

export interface AIRunOptions {
  prompt?: string;
  messages?: Array<{ role: string; content: string }>;
  max_tokens?: number;
  temperature?: number;
  top_p?: number;
  top_k?: number;
  stream?: boolean;
}

export interface AIResponse {
  response?: string;
  content?: string;
  text?: string;
  choices?: Array<{ message: { content: string } }>;
  error?: string;
}

// KV Namespace Types
export interface KVNamespace {
  get(key: string, options?: KVGetOptions): Promise<string | null>;
  getWithMetadata<M = unknown>(key: string, options?: KVGetOptions): Promise<KVValueWithMetadata<M>>;
  put(key: string, value: string | ArrayBuffer | ReadableStream, options?: KVPutOptions): Promise<void>;
  delete(key: string): Promise<void>;
  list(options?: KVListOptions): Promise<KVListResult>;
}

export interface KVGetOptions {
  type?: 'text' | 'json' | 'arrayBuffer' | 'stream';
  cacheTtl?: number;
}

export interface KVPutOptions {
  expiration?: number;
  expirationTtl?: number;
  metadata?: Record<string, any>;
}

export interface KVListOptions {
  prefix?: string;
  limit?: number;
  cursor?: string;
}

export interface KVListResult {
  keys: Array<{ name: string; expiration?: number; metadata?: Record<string, any> }>;
  list_complete: boolean;
  cursor?: string;
}

export interface KVValueWithMetadata<M = unknown> {
  value: string | null;
  metadata: M | null;
}

// R2 Bucket Types
export interface R2Bucket {
  get(key: string): Promise<R2Object | null>;
  put(key: string, value: ReadableStream | ArrayBuffer | string, options?: R2PutOptions): Promise<R2Object>;
  delete(key: string): Promise<void>;
  list(options?: R2ListOptions): Promise<R2Objects>;
  head(key: string): Promise<R2Object | null>;
}

export interface R2Object {
  key: string;
  version: string;
  size: number;
  etag: string;
  httpEtag: string;
  checksums: R2Checksums;
  uploaded: Date;
  httpMetadata?: R2HTTPMetadata;
  customMetadata?: Record<string, string>;
  range?: R2Range;
  body?: ReadableStream;
  text(): Promise<string>;
  json<T = unknown>(): Promise<T>;
  arrayBuffer(): Promise<ArrayBuffer>;
}

export interface R2PutOptions {
  httpMetadata?: R2HTTPMetadata;
  customMetadata?: Record<string, string>;
  md5?: string;
  sha1?: string;
  sha256?: string;
  sha384?: string;
  sha512?: string;
}

export interface R2ListOptions {
  prefix?: string;
  cursor?: string;
  delimiter?: string;
  limit?: number;
  include?: Array<'httpMetadata' | 'customMetadata'>;
}

export interface R2Objects {
  objects: R2Object[];
  truncated: boolean;
  cursor?: string;
  delimitedPrefixes?: string[];
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

export interface R2Range {
  offset?: number;
  length?: number;
  suffix?: number;
}

// D1 Database Types
export interface D1Database {
  prepare(query: string): D1PreparedStatement;
  batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]>;
  exec(query: string): Promise<D1ExecResult>;
  dump(): Promise<ArrayBuffer>;
}

export interface D1PreparedStatement {
  bind(...values: any[]): D1PreparedStatement;
  first<T = unknown>(colName?: string): Promise<T | null>;
  run<T = unknown>(): Promise<D1Result<T>>;
  all<T = unknown>(): Promise<D1Result<T>>;
  raw<T = unknown>(): Promise<T[]>;
}

export interface D1Result<T = unknown> {
  results?: T[];
  success: boolean;
  error?: string;
  meta: {
    duration: number;
    rows_read: number;
    rows_written: number;
  };
}

export interface D1ExecResult {
  count: number;
  duration: number;
}

// Durable Object Types
export interface DurableObjectNamespace {
  newUniqueId(): DurableObjectId;
  idFromName(name: string): DurableObjectId;
  idFromString(id: string): DurableObjectId;
  get(id: DurableObjectId): DurableObjectStub;
}

export interface DurableObjectId {
  toString(): string;
  equals(other: DurableObjectId): boolean;
}

export interface DurableObjectStub {
  fetch(request: Request): Promise<Response>;
  name?: string;
  id: DurableObjectId;
}

// Analytics Engine Types
export interface AnalyticsEngine {
  writeDataPoint(dataPoint: AnalyticsDataPoint): Promise<void>;
}

export interface AnalyticsDataPoint {
  indexes: Array<string | number>;
  doubles?: number[];
  blobs?: string[];
}

// Request Context Types
export interface RequestContext {
  env: CloudflareEnvironment;
  ctx: ExecutionContext;
  request: Request;
  params?: Record<string, string>;
  user?: AuthenticatedUser;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: 'creator' | 'influencer' | 'admin';
  permissions?: string[];
}

// Execution Context Types
export interface ExecutionContext {
  waitUntil(promise: Promise<any>): void;
  passThroughOnException(): void;
}

// Export type guards
export function isCloudflareEnvironment(env: any): env is CloudflareEnvironment {
  return env && typeof env === 'object' && 'NODE_ENV' in env;
}

export function isKVNamespace(obj: any): obj is KVNamespace {
  return obj && typeof obj.get === 'function' && typeof obj.put === 'function';
}

export function isR2Bucket(obj: any): obj is R2Bucket {
  return obj && typeof obj.get === 'function' && typeof obj.list === 'function';
}

export function isD1Database(obj: any): obj is D1Database {
  return obj && typeof obj.prepare === 'function' && typeof obj.exec === 'function';
}

// Global type augmentation for better TypeScript support
declare global {
  interface Window {
    env?: CloudflareEnvironment;
  }
}