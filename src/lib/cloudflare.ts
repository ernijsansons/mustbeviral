// Cloudflare D1, KV, and R2 client setup
// LOG: CF-INIT-1 - Initialize Cloudflare services

// Cloudflare Workers types
declare global {
  interface D1Database {
    prepare(query: string): D1PreparedStatement;
    batch(statements: D1PreparedStatement[]): Promise<D1Result[]>;
    exec(query: string): Promise<D1ExecResult>;
    dump(): Promise<ArrayBuffer>;
  }

  interface D1PreparedStatement {
    bind(...params: any[]): D1PreparedStatement;
    first<T = any>(): Promise<T | null>;
    run(): Promise<D1Result>;
    all<T = any>(): Promise<D1Result<T>>;
  }

  interface D1Result<T = any> {
    results: T[];
    success: boolean;
    meta: D1Meta;
    error?: string;
  }

  interface D1ExecResult {
    count: number;
    duration: number;
  }

  interface D1Meta {
    served_by: string;
    duration: number;
    changes: number;
    last_row_id: number;
    changed_db: boolean;
    size_after: number;
    rows_read: number;
    rows_written: number;
  }

  interface KVNamespace {
    get(key: string, options?: { type?: 'text' | 'json' | 'arrayBuffer' | 'stream' }): Promise<any>;
    put(key: string, value: string | ArrayBuffer | ReadableStream, options?: KVNamespacePutOptions): Promise<void>;
    delete(key: string): Promise<void>;
    list(options?: KVNamespaceListOptions): Promise<KVNamespaceListResult>;
  }

  interface KVNamespacePutOptions {
    expiration?: number;
    expirationTtl?: number;
    metadata?: any;
  }

  interface KVNamespaceListOptions {
    limit?: number;
    prefix?: string;
    cursor?: string;
  }

  interface KVNamespaceListResult {
    keys: KVNamespaceListKey[];
    list_complete: boolean;
    cursor?: string;
  }

  interface KVNamespaceListKey {
    name: string;
    expiration?: number;
    metadata?: any;
  }

  interface R2Bucket {
    get(key: string): Promise<R2ObjectBody | null>;
    put(key: string, value: ArrayBuffer | ReadableStream | string, options?: R2PutOptions): Promise<R2Object | null>;
    delete(key: string): Promise<void>;
    list(options?: R2ListOptions): Promise<R2Objects>;
  }

  interface R2Object {
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

  interface R2ObjectBody extends R2Object {
    body: ReadableStream;
    bodyUsed: boolean;
    arrayBuffer(): Promise<ArrayBuffer>;
    text(): Promise<string>;
    json<T = any>(): Promise<T>;
    blob(): Promise<Blob>;
  }

  interface R2PutOptions {
    httpMetadata?: R2HTTPMetadata;
    customMetadata?: Record<string, string>;
    md5?: ArrayBuffer | string;
    sha1?: ArrayBuffer | string;
    sha256?: ArrayBuffer | string;
    sha384?: ArrayBuffer | string;
    sha512?: ArrayBuffer | string;
  }

  interface R2HTTPMetadata {
    contentType?: string;
    contentLanguage?: string;
    contentDisposition?: string;
    contentEncoding?: string;
    cacheControl?: string;
    cacheExpiry?: Date;
  }

  interface R2Checksums {
    md5?: ArrayBuffer;
    sha1?: ArrayBuffer;
    sha256?: ArrayBuffer;
    sha384?: ArrayBuffer;
    sha512?: ArrayBuffer;
  }

  interface R2ListOptions {
    limit?: number;
    prefix?: string;
    cursor?: string;
    delimiter?: string;
    include?: ('httpMetadata' | 'customMetadata')[];
  }

  interface R2Objects {
    objects: R2Object[];
    truncated: boolean;
    cursor?: string;
    delimitedPrefixes: string[];
  }
}

export interface CloudflareEnv {
  DB: D1Database;
  TRENDS_CACHE: KVNamespace;
  ASSETS_STORAGE: R2Bucket;
  JWT_SECRET: string;
  STRIPE_SECRET_KEY: string;
}

// D1 Database Client Wrapper
export class D1Client {
  private db: D1Database;

  constructor(database: D1Database) {
    this.db = database;
    console.log('LOG: CF-D1-1 - D1 client initialized');
  }

  async executeQuery(query: string, params: any[] = []): Promise<D1Result> {
    console.log('LOG: CF-D1-2 - Executing query:', query.substring(0, 50));
    
    try {
      const statement = this.db.prepare(query);
      const result = params.length > 0 
        ? await statement.bind(...params).run()
        : await statement.run();
      
      console.log('LOG: CF-D1-3 - Query executed successfully');
      return result;
    } catch (error) {
      console.error('LOG: CF-D1-ERROR-1 - Query execution failed:', error);
      throw new Error(`D1 query failed: ${error}`);
    }
  }

  async fetchOne<T>(query: string, params: any[] = []): Promise<T | null> {
    console.log('LOG: CF-D1-4 - Fetching single record');
    
    try {
      const statement = this.db.prepare(query);
      const result = params.length > 0 
        ? await statement.bind(...params).first()
        : await statement.first();
      
      return result as T | null;
    } catch (error) {
      console.error('LOG: CF-D1-ERROR-2 - Fetch one failed:', error);
      throw new Error(`D1 fetch failed: ${error}`);
    }
  }

  async fetchAll<T>(query: string, params: any[] = []): Promise<T[]> {
    console.log('LOG: CF-D1-5 - Fetching multiple records');
    
    try {
      const statement = this.db.prepare(query);
      const result = params.length > 0 
        ? await statement.bind(...params).all()
        : await statement.all();
      
      return result.results as T[];
    } catch (error) {
      console.error('LOG: CF-D1-ERROR-3 - Fetch all failed:', error);
      throw new Error(`D1 fetch failed: ${error}`);
    }
  }

  async batch(statements: D1PreparedStatement[]): Promise<D1Result[]> {
    console.log('LOG: CF-D1-6 - Executing batch statements:', statements.length);
    
    try {
      const results = await this.db.batch(statements);
      console.log('LOG: CF-D1-7 - Batch executed successfully');
      return results;
    } catch (error) {
      console.error('LOG: CF-D1-ERROR-4 - Batch execution failed:', error);
      throw new Error(`D1 batch failed: ${error}`);
    }
  }

  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      await this.fetchOne('SELECT 1 as health');
      return true;
    } catch (error) {
      console.error('LOG: CF-D1-HEALTH-ERROR:', error);
      return false;
    }
  }
}

// KV Storage Client Wrapper
export class KVClient {
  private kv: KVNamespace;

  constructor(kvNamespace: KVNamespace) {
    this.kv = kvNamespace;
    console.log('LOG: CF-KV-1 - KV client initialized');
  }

  async get(key: string): Promise<string | null> {
    console.log('LOG: CF-KV-2 - Getting value for key:', key);
    
    try {
      const value = await this.kv.get(key);
      console.log('LOG: CF-KV-3 - Value retrieved:', value ? 'found' : 'not found');
      return value;
    } catch (error) {
      console.error('LOG: CF-KV-ERROR-1 - Get failed:', error);
      throw new Error(`KV get failed: ${error}`);
    }
  }

  async getJSON<T>(key: string): Promise<T | null> {
    console.log('LOG: CF-KV-4 - Getting JSON value for key:', key);
    
    try {
      const value = await this.kv.get(key, { type: 'json' });
      return value as T | null;
    } catch (error) {
      console.error('LOG: CF-KV-ERROR-2 - Get JSON failed:', error);
      throw new Error(`KV get JSON failed: ${error}`);
    }
  }

  async put(key: string, value: string, options?: KVNamespacePutOptions): Promise<void> {
    console.log('LOG: CF-KV-5 - Putting value for key:', key);
    
    try {
      await this.kv.put(key, value, options);
      console.log('LOG: CF-KV-6 - Value stored successfully');
    } catch (error) {
      console.error('LOG: CF-KV-ERROR-3 - Put failed:', error);
      throw new Error(`KV put failed: ${error}`);
    }
  }

  async putJSON(key: string, value: any, options?: KVNamespacePutOptions): Promise<void> {
    console.log('LOG: CF-KV-7 - Putting JSON value for key:', key);
    
    try {
      await this.kv.put(key, JSON.stringify(value), options);
      console.log('LOG: CF-KV-8 - JSON value stored successfully');
    } catch (error) {
      console.error('LOG: CF-KV-ERROR-4 - Put JSON failed:', error);
      throw new Error(`KV put JSON failed: ${error}`);
    }
  }

  async delete(key: string): Promise<void> {
    console.log('LOG: CF-KV-9 - Deleting key:', key);
    
    try {
      await this.kv.delete(key);
      console.log('LOG: CF-KV-10 - Key deleted successfully');
    } catch (error) {
      console.error('LOG: CF-KV-ERROR-5 - Delete failed:', error);
      throw new Error(`KV delete failed: ${error}`);
    }
  }

  // Cache trends data with TTL
  async cacheTrends(data: any, ttlSeconds: number = 3600): Promise<void> {
    console.log('LOG: CF-KV-TRENDS-1 - Caching trends data');
    
    await this.putJSON('latest_trends', data, {
      expirationTtl: ttlSeconds
    });
  }

  async getCachedTrends(): Promise<any | null> {
    console.log('LOG: CF-KV-TRENDS-2 - Getting cached trends');
    
    return await this.getJSON('latest_trends');
  }
}

// R2 Storage Client Wrapper
export class R2Client {
  private r2: R2Bucket;

  constructor(r2Bucket: R2Bucket) {
    this.r2 = r2Bucket;
    console.log('LOG: CF-R2-1 - R2 client initialized');
  }

  async put(key: string, data: ArrayBuffer | ReadableStream, options?: R2PutOptions): Promise<R2Object | null> {
    console.log('LOG: CF-R2-2 - Putting object with key:', key);
    
    try {
      const result = await this.r2.put(key, data, options);
      console.log('LOG: CF-R2-3 - Object stored successfully');
      return result;
    } catch (error) {
      console.error('LOG: CF-R2-ERROR-1 - Put failed:', error);
      throw new Error(`R2 put failed: ${error}`);
    }
  }

  async get(key: string): Promise<R2ObjectBody | null> {
    console.log('LOG: CF-R2-4 - Getting object with key:', key);
    
    try {
      const object = await this.r2.get(key);
      console.log('LOG: CF-R2-5 - Object retrieved:', object ? 'found' : 'not found');
      return object;
    } catch (error) {
      console.error('LOG: CF-R2-ERROR-2 - Get failed:', error);
      throw new Error(`R2 get failed: ${error}`);
    }
  }

  async delete(key: string): Promise<void> {
    console.log('LOG: CF-R2-6 - Deleting object with key:', key);
    
    try {
      await this.r2.delete(key);
      console.log('LOG: CF-R2-7 - Object deleted successfully');
    } catch (error) {
      console.error('LOG: CF-R2-ERROR-3 - Delete failed:', error);
      throw new Error(`R2 delete failed: ${error}`);
    }
  }

  // Upload user-generated content
  async uploadAsset(userId: string, filename: string, data: ArrayBuffer, contentType?: string): Promise<string> {
    console.log('LOG: CF-R2-ASSET-1 - Uploading asset:', filename);
    
    const key = `assets/${userId}/${Date.now()}-${filename}`;
    const options: R2PutOptions = {};
    
    if (contentType) {
      options.httpMetadata = { contentType };
    }
    
    await this.put(key, data, options);
    console.log('LOG: CF-R2-ASSET-2 - Asset uploaded with key:', key);
    
    return key;
  }

  // Get public URL for asset (if configured with custom domain)
  getAssetUrl(key: string, domain?: string): string {
    if (domain) {
      return `https://${domain}/${key}`;
    }
    return `r2://${key}`; // Internal reference
  }
}

// Main Cloudflare service class
export class CloudflareService {
  public db: D1Client;
  public kv: KVClient;
  public r2: R2Client;
  public env: CloudflareEnv;

  constructor(env: CloudflareEnv) {
    this.env = env;
    this.db = new D1Client(env.DB);
    this.kv = new KVClient(env.TRENDS_CACHE);
    this.r2 = new R2Client(env.ASSETS_STORAGE);
    
    console.log('LOG: CF-SERVICE-1 - Cloudflare service initialized');
  }

  // Health check for all services
  async healthCheck(): Promise<{ db: boolean; kv: boolean; r2: boolean }> {
    console.log('LOG: CF-SERVICE-2 - Performing health check');
    
    const checks = await Promise.allSettled([
      this.db.healthCheck(),
      this.kv.get('health_check').then(() => true).catch(() => false),
      this.r2.get('health_check').then(() => true).catch(() => false)
    ]);

    return {
      db: checks[0].status === 'fulfilled' ? checks[0].value : false,
      kv: checks[1].status === 'fulfilled' ? checks[1].value : false,
      r2: checks[2].status === 'fulfilled' ? checks[2].value : false
    };
  }
}

// Helper function to initialize Cloudflare service in Workers
export function initCloudflareService(env: CloudflareEnv): CloudflareService {
  console.log('LOG: CF-INIT-2 - Initializing Cloudflare service');
  return new CloudflareService(env);
}