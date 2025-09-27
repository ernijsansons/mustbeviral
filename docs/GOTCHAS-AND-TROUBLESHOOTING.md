# Must Be Viral V2 - Gotchas & Troubleshooting Guide

## Overview

This comprehensive guide covers common pitfalls, troubleshooting procedures, and best practices for developing and maintaining Must Be Viral V2. Learn from common mistakes and quickly resolve issues with proven solutions.

## Table of Contents

1. [Development Gotchas](#development-gotchas)
2. [Deployment Gotchas](#deployment-gotchas)
3. [Security Gotchas](#security-gotchas)
4. [Performance Gotchas](#performance-gotchas)
5. [Database Gotchas](#database-gotchas)
6. [API Integration Gotchas](#api-integration-gotchas)
7. [Troubleshooting Guides](#troubleshooting-guides)
8. [Error Resolution](#error-resolution)
9. [Monitoring & Debugging](#monitoring--debugging)
10. [Developer Onboarding](#developer-onboarding)

---

## Development Gotchas

### 1. Cloudflare Workers Environment

#### Gotcha: Node.js Compatibility Issues
**Problem:** Standard Node.js APIs don't work in Workers
```typescript
// ❌ This doesn't work in Workers
import fs from 'fs';
import path from 'path';

// ✅ Use Workers-compatible alternatives
import { readFile } from '@cloudflare/workers-fs'; // Custom implementation
```

**Solution:**
```typescript
// Use Web APIs or Workers-specific implementations
const buffer = new ArrayBuffer(1024);
const view = new Uint8Array(buffer);

// For file operations, use R2 or KV
await env.R2_BUCKET.get('file.txt');
await env.KV_NAMESPACE.get('key');
```

#### Gotcha: Module Resolution in TypeScript
**Problem:** Complex module paths break in Workers
```typescript
// ❌ Complex relative imports
import { utils } from '../../../shared/utils/helpers';

// ✅ Use absolute imports with path mapping
import { utils } from '@/shared/utils/helpers';
```

**Solution in tsconfig.json:**
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@/shared/*": ["shared/*"],
      "@/types/*": ["types/*"]
    }
  }
}
```

### 2. State Management

#### Gotcha: Global State Persistence
**Problem:** Workers don't persist state between requests
```typescript
// ❌ This won't work across requests
let globalCounter = 0;

export default {
  async fetch() {
    globalCounter++; // Resets to 0 on each cold start
    return new Response(`Count: ${globalCounter}`);
  }
};
```

**Solution:**
```typescript
// ✅ Use Durable Objects for persistent state
export class Counter {
  private value = 0;

  async fetch(request: Request): Promise<Response> {
    this.value++;
    return new Response(`Count: ${this.value}`);
  }
}

// Or use external storage
const count = parseInt(await env.KV.get('counter') || '0') + 1;
await env.KV.put('counter', count.toString());
```

### 3. Environment Variables

#### Gotcha: Environment Variable Types
**Problem:** All environment variables are strings
```typescript
// ❌ This comparison fails
if (env.RATE_LIMIT_MAX === 100) { // Always false

// ✅ Convert types explicitly
if (parseInt(env.RATE_LIMIT_MAX) === 100) {
```

**Solution:**
```typescript
// Create typed environment interface
interface Env {
  RATE_LIMIT_MAX: string;
  ENABLE_FEATURE: string;
  API_TIMEOUT: string;
}

// Use helper functions for conversion
function getEnvNumber(env: Env, key: keyof Env, defaultValue: number = 0): number {
  const value = env[key];
  const parsed = parseInt(value);
  return isNaN(parsed) ? defaultValue : parsed;
}

function getEnvBoolean(env: Env, key: keyof Env, defaultValue: boolean = false): boolean {
  const value = env[key]?.toLowerCase();
  return value === 'true' || value === '1' || value === 'yes';
}
```

### 4. Async/Await Patterns

#### Gotcha: Unhandled Promise Rejections
**Problem:** Promises rejected without proper error handling
```typescript
// ❌ Unhandled promise rejection
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    await this.backgroundTask(env); // Can throw but not awaited properly
    return new Response('OK');
  }
};
```

**Solution:**
```typescript
// ✅ Proper error handling
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    try {
      // For fire-and-forget tasks, use waitUntil
      ctx.waitUntil(this.backgroundTask(env).catch(console.error));

      // For critical tasks, await with error handling
      await this.criticalTask(env);

      return new Response('OK');
    } catch (error) {
      console.error('Request failed:', error);
      return new Response('Internal Server Error', { status: 500 });
    }
  }
};
```

---

## Deployment Gotchas

### 1. Wrangler Configuration

#### Gotcha: Binding Mismatches
**Problem:** Wrangler.toml bindings don't match code
```toml
# wrangler.toml
[env.production]
vars = { API_URL = "https://api.example.com" }

kv_namespaces = [
  { binding = "MY_KV", id = "wrong-id" }
]
```

```typescript
// Code expects different binding name
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    await env.USER_KV.get('key'); // ❌ Binding name mismatch
  }
};
```

**Solution:**
```typescript
// ✅ Create typed environment interface
interface Env {
  // Match exactly with wrangler.toml
  MY_KV: KVNamespace;
  API_URL: string;

  // D1 bindings
  AUTH_DB: D1Database;

  // R2 bindings
  ASSETS: R2Bucket;

  // Durable Object bindings
  RATE_LIMITER: DurableObjectNamespace;
}

// Validate bindings at startup
function validateEnvironment(env: Env): void {
  const required = ['MY_KV', 'API_URL', 'AUTH_DB'];
  for (const key of required) {
    if (!env[key as keyof Env]) {
      throw new Error(`Missing required binding: ${key}`);
    }
  }
}
```

### 2. Resource Limits

#### Gotcha: CPU Time Limits
**Problem:** Long-running operations exceed CPU time limit
```typescript
// ❌ This will timeout
export default {
  async fetch(): Promise<Response> {
    const result = await processLargeDataset(); // Takes > 30 seconds
    return new Response(result);
  }
};
```

**Solution:**
```typescript
// ✅ Break work into chunks
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    // Start processing asynchronously
    ctx.waitUntil(processLargeDatasetInChunks(env));

    // Return immediate response
    return new Response(JSON.stringify({
      status: 'processing',
      message: 'Your request is being processed'
    }));
  }
};

async function processLargeDatasetInChunks(env: Env): Promise<void> {
  const chunks = await getDataChunks();

  for (const chunk of chunks) {
    await env.PROCESSING_QUEUE.send(chunk);
  }
}
```

### 3. Cold Start Performance

#### Gotcha: Slow Cold Starts
**Problem:** Heavy imports cause slow cold starts
```typescript
// ❌ Heavy imports slow down cold starts
import { HeavyLibrary } from 'heavy-library';
import { AnotherHeavyLib } from 'another-heavy-lib';
import { ComplexFramework } from 'complex-framework';

export default {
  async fetch(): Promise<Response> {
    // Library only used occasionally
    const result = HeavyLibrary.process();
    return new Response(result);
  }
};
```

**Solution:**
```typescript
// ✅ Lazy load heavy dependencies
export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/heavy-operation') {
      // Dynamic import only when needed
      const { HeavyLibrary } = await import('heavy-library');
      const result = HeavyLibrary.process();
      return new Response(result);
    }

    return new Response('Light operation');
  }
};
```

---

## Security Gotchas

### 1. JWT Token Security

#### Gotcha: JWT Secret Exposure
**Problem:** JWT secrets hardcoded or logged
```typescript
// ❌ Never hardcode secrets
const JWT_SECRET = 'my-super-secret-key';

// ❌ Don't log tokens
console.log('Token:', token);
```

**Solution:**
```typescript
// ✅ Use environment variables
const jwtSecret = new TextEncoder().encode(env.JWT_SECRET);

// ✅ Safe logging without exposing tokens
console.log('Token validation result:', {
  isValid: true,
  userId: payload.userId,
  // Never log the actual token
});

// ✅ Implement token rotation
class TokenManager {
  private currentSecret: Uint8Array;
  private previousSecret: Uint8Array;

  constructor(env: Env) {
    this.currentSecret = new TextEncoder().encode(env.JWT_SECRET);
    this.previousSecret = new TextEncoder().encode(env.JWT_SECRET_PREVIOUS);
  }

  async verifyToken(token: string): Promise<TokenPayload | null> {
    try {
      // Try current secret first
      return await jwtVerify(token, this.currentSecret);
    } catch {
      try {
        // Fallback to previous secret during rotation
        return await jwtVerify(token, this.previousSecret);
      } catch {
        return null;
      }
    }
  }
}
```

### 2. CORS Configuration

#### Gotcha: Overly Permissive CORS
**Problem:** Wildcard origins in production
```typescript
// ❌ Too permissive for production
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Credentials': 'true'  // Security risk with wildcard
};
```

**Solution:**
```typescript
// ✅ Specific origins and proper validation
class CORSManager {
  private allowedOrigins: string[];

  constructor(env: Env) {
    this.allowedOrigins = env.ALLOWED_ORIGINS.split(',');
  }

  getCORSHeaders(origin: string | null): Record<string, string> {
    if (!origin || !this.isOriginAllowed(origin)) {
      return {};
    }

    return {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400'
    };
  }

  private isOriginAllowed(origin: string): boolean {
    return this.allowedOrigins.includes(origin) ||
           (process.env.NODE_ENV === 'development' &&
            origin.startsWith('http://localhost:'));
  }
}
```

### 3. Input Validation

#### Gotcha: Insufficient Input Sanitization
**Problem:** Trusting user input without validation
```typescript
// ❌ Direct database insertion without validation
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const { email, content } = await request.json();

    // Direct insertion - SQL injection risk
    await env.DB.prepare(`
      INSERT INTO users (email, content) VALUES ('${email}', '${content}')
    `).run();
  }
};
```

**Solution:**
```typescript
// ✅ Comprehensive input validation
import { z } from 'zod';

const CreateUserSchema = z.object({
  email: z.string().email().max(254),
  content: z.string().max(1000).refine(
    (val) => !/<script/i.test(val),
    'Script tags not allowed'
  ),
  age: z.number().int().min(13).max(120)
});

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      const body = await request.json();

      // Validate input
      const validatedData = CreateUserSchema.parse(body);

      // Use parameterized queries
      await env.DB.prepare(`
        INSERT INTO users (email, content, age) VALUES (?, ?, ?)
      `).bind(
        validatedData.email,
        validatedData.content,
        validatedData.age
      ).run();

      return new Response('User created');
    } catch (error) {
      if (error instanceof z.ZodError) {
        return new Response(
          JSON.stringify({ errors: error.errors }),
          { status: 400 }
        );
      }
      throw error;
    }
  }
};
```

---

## Performance Gotchas

### 1. Database Query Optimization

#### Gotcha: N+1 Query Problem
**Problem:** Multiple queries in loops
```typescript
// ❌ N+1 query problem
async function getUsersWithPosts(env: Env): Promise<UserWithPosts[]> {
  const users = await env.DB.prepare('SELECT * FROM users').all();

  const result = [];
  for (const user of users.results) {
    // This creates N additional queries
    const posts = await env.DB.prepare(
      'SELECT * FROM posts WHERE user_id = ?'
    ).bind(user.id).all();

    result.push({ ...user, posts: posts.results });
  }

  return result;
}
```

**Solution:**
```typescript
// ✅ Use JOINs or batch queries
async function getUsersWithPosts(env: Env): Promise<UserWithPosts[]> {
  // Option 1: JOIN query
  const result = await env.DB.prepare(`
    SELECT
      u.id, u.email, u.username,
      p.id as post_id, p.title, p.content
    FROM users u
    LEFT JOIN posts p ON u.id = p.user_id
    ORDER BY u.id
  `).all();

  // Group results by user
  const usersMap = new Map();
  for (const row of result.results) {
    if (!usersMap.has(row.id)) {
      usersMap.set(row.id, {
        id: row.id,
        email: row.email,
        username: row.username,
        posts: []
      });
    }

    if (row.post_id) {
      usersMap.get(row.id).posts.push({
        id: row.post_id,
        title: row.title,
        content: row.content
      });
    }
  }

  return Array.from(usersMap.values());
}
```

### 2. Cache Strategy Issues

#### Gotcha: Cache Stampede
**Problem:** Multiple requests hitting expensive operations
```typescript
// ❌ Cache stampede - multiple requests compute same expensive result
async function getExpensiveData(key: string, env: Env): Promise<any> {
  const cached = await env.KV.get(key);
  if (cached) {
    return JSON.parse(cached);
  }

  // Multiple requests might execute this expensive operation
  const result = await computeExpensiveResult();
  await env.KV.put(key, JSON.stringify(result), { expirationTtl: 300 });

  return result;
}
```

**Solution:**
```typescript
// ✅ Use locking mechanism to prevent cache stampede
class CacheManager {
  private computingKeys = new Set<string>();

  async getOrCompute<T>(
    key: string,
    computeFn: () => Promise<T>,
    ttl: number = 300
  ): Promise<T> {
    // Check cache first
    const cached = await this.env.KV.get(key);
    if (cached) {
      return JSON.parse(cached);
    }

    // Check if already computing
    if (this.computingKeys.has(key)) {
      // Wait a bit and try cache again
      await new Promise(resolve => setTimeout(resolve, 100));
      const recheck = await this.env.KV.get(key);
      if (recheck) {
        return JSON.parse(recheck);
      }
    }

    // Mark as computing
    this.computingKeys.add(key);

    try {
      const result = await computeFn();
      await this.env.KV.put(key, JSON.stringify(result), { expirationTtl: ttl });
      return result;
    } finally {
      this.computingKeys.delete(key);
    }
  }
}
```

### 3. Memory Management

#### Gotcha: Memory Leaks with Large Objects
**Problem:** Holding references to large objects
```typescript
// ❌ Memory leak - large objects not cleaned up
class DataProcessor {
  private cache = new Map(); // Grows indefinitely

  async processData(data: LargeDataSet): Promise<ProcessedData> {
    const key = this.generateKey(data);

    if (this.cache.has(key)) {
      return this.cache.get(key);
    }

    const result = await this.expensiveProcessing(data);
    this.cache.set(key, result); // Never cleaned up

    return result;
  }
}
```

**Solution:**
```typescript
// ✅ Implement cache with size limits and TTL
class DataProcessor {
  private cache = new Map<string, CacheEntry>();
  private readonly maxCacheSize = 100;

  async processData(data: LargeDataSet): Promise<ProcessedData> {
    this.cleanupExpiredEntries();

    const key = this.generateKey(data);
    const cached = this.cache.get(key);

    if (cached && !this.isExpired(cached)) {
      return cached.data;
    }

    const result = await this.expensiveProcessing(data);

    // Implement LRU eviction
    if (this.cache.size >= this.maxCacheSize) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }

    this.cache.set(key, {
      data: result,
      timestamp: Date.now(),
      ttl: 300000 // 5 minutes
    });

    return result;
  }

  private cleanupExpiredEntries(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (this.isExpired(entry)) {
        this.cache.delete(key);
      }
    }
  }

  private isExpired(entry: CacheEntry): boolean {
    return Date.now() - entry.timestamp > entry.ttl;
  }
}
```

---

## Database Gotchas

### 1. D1 Database Limitations

#### Gotcha: Transaction Rollback Issues
**Problem:** D1 doesn't support traditional transactions
```typescript
// ❌ This won't work in D1
await env.DB.exec('BEGIN TRANSACTION');
try {
  await env.DB.prepare('INSERT INTO users ...').run();
  await env.DB.prepare('INSERT INTO profiles ...').run();
  await env.DB.exec('COMMIT');
} catch (error) {
  await env.DB.exec('ROLLBACK'); // Not supported
}
```

**Solution:**
```typescript
// ✅ Use D1 batch operations
async function createUserWithProfile(userData: UserData, env: Env): Promise<void> {
  const userInsert = env.DB.prepare(`
    INSERT INTO users (id, email, username) VALUES (?, ?, ?)
  `).bind(userData.id, userData.email, userData.username);

  const profileInsert = env.DB.prepare(`
    INSERT INTO profiles (user_id, first_name, last_name) VALUES (?, ?, ?)
  `).bind(userData.id, userData.firstName, userData.lastName);

  // Atomic batch operation
  await env.DB.batch([userInsert, profileInsert]);
}
```

### 2. Connection Management

#### Gotcha: Database Connection Exhaustion
**Problem:** Not properly managing database connections
```typescript
// ❌ Creating too many concurrent connections
async function bulkInsert(items: any[], env: Env): Promise<void> {
  const promises = items.map(async (item) => {
    // Each creates a new connection
    return env.DB.prepare('INSERT INTO items ...').bind(item.id).run();
  });

  await Promise.all(promises); // May exhaust connections
}
```

**Solution:**
```typescript
// ✅ Batch operations and control concurrency
async function bulkInsert(items: any[], env: Env): Promise<void> {
  const BATCH_SIZE = 50;

  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE);

    const statements = batch.map(item =>
      env.DB.prepare('INSERT INTO items (id, data) VALUES (?, ?)')
        .bind(item.id, JSON.stringify(item.data))
    );

    await env.DB.batch(statements);
  }
}
```

### 3. Data Type Handling

#### Gotcha: SQLite Type Coercion
**Problem:** Unexpected type conversions
```typescript
// ❌ SQLite type coercion can cause issues
await env.DB.prepare(`
  INSERT INTO users (id, active, score) VALUES (?, ?, ?)
`).bind('123', 'true', '95.5'); // All strings

// Later...
const user = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(123).first();
// Might not find user due to type mismatch
```

**Solution:**
```typescript
// ✅ Explicit type conversion
function prepareUserData(data: any): [number, boolean, number] {
  return [
    parseInt(data.id),
    Boolean(data.active),
    parseFloat(data.score)
  ];
}

await env.DB.prepare(`
  INSERT INTO users (id, active, score) VALUES (?, ?, ?)
`).bind(...prepareUserData(userData));
```

---

## API Integration Gotchas

### 1. AI API Rate Limits

#### Gotcha: Hitting AI Provider Rate Limits
**Problem:** Not handling AI API rate limits properly
```typescript
// ❌ No rate limit handling
async function generateContent(prompt: string): Promise<string> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ prompt })
  });

  if (!response.ok) {
    throw new Error('API call failed');
  }

  const data = await response.json();
  return data.choices[0].message.content;
}
```

**Solution:**
```typescript
// ✅ Implement retry with exponential backoff
class AIApiClient {
  private async makeRequest(
    url: string,
    options: RequestInit,
    maxRetries: number = 3
  ): Promise<Response> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const response = await fetch(url, options);

      if (response.ok) {
        return response;
      }

      if (response.status === 429) {
        // Rate limited - get retry-after header or use exponential backoff
        const retryAfter = response.headers.get('retry-after');
        const delay = retryAfter
          ? parseInt(retryAfter) * 1000
          : Math.min(1000 * Math.pow(2, attempt), 30000);

        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      if (attempt === maxRetries) {
        throw new APIError(`API call failed after ${maxRetries} attempts`, response.status);
      }
    }

    throw new Error('Unexpected error in retry logic');
  }

  async generateContent(prompt: string): Promise<string> {
    const response = await this.makeRequest('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1000
      })
    });

    const data = await response.json();
    return data.choices[0].message.content;
  }
}
```

### 2. WebSocket Connection Management

#### Gotcha: WebSocket Connection Cleanup
**Problem:** Not properly cleaning up WebSocket connections
```typescript
// ❌ Connections not properly tracked or cleaned up
export class WebSocketRoom {
  private connections = new Map<string, WebSocket>();

  async handleWebSocket(request: Request): Promise<Response> {
    const [client, server] = Object.values(new WebSocketPair());

    const connectionId = this.generateId();
    this.connections.set(connectionId, server);

    server.addEventListener('message', this.handleMessage.bind(this));
    // Missing error and close handlers

    return new Response(null, { status: 101, webSocket: client });
  }
}
```

**Solution:**
```typescript
// ✅ Proper connection lifecycle management
export class WebSocketRoom {
  private connections = new Map<string, ConnectionInfo>();
  private heartbeatInterval: NodeJS.Timeout;

  constructor() {
    // Clean up stale connections every 30 seconds
    this.heartbeatInterval = setInterval(() => {
      this.cleanupStaleConnections();
    }, 30000);
  }

  async handleWebSocket(request: Request): Promise<Response> {
    const [client, server] = Object.values(new WebSocketPair());

    const connectionId = this.generateId();
    const connectionInfo = {
      socket: server,
      lastPing: Date.now(),
      userId: this.extractUserId(request)
    };

    this.connections.set(connectionId, connectionInfo);

    server.addEventListener('message', (event) => {
      this.handleMessage(connectionId, event);
    });

    server.addEventListener('close', () => {
      this.connections.delete(connectionId);
      this.notifyUserDisconnected(connectionInfo.userId);
    });

    server.addEventListener('error', (error) => {
      console.error(`WebSocket error for ${connectionId}:`, error);
      this.connections.delete(connectionId);
    });

    // Accept the WebSocket connection
    server.accept();

    return new Response(null, { status: 101, webSocket: client });
  }

  private cleanupStaleConnections(): void {
    const now = Date.now();
    const staleThreshold = 60000; // 1 minute

    for (const [id, info] of this.connections.entries()) {
      if (now - info.lastPing > staleThreshold) {
        try {
          info.socket.close();
        } catch (error) {
          console.error('Error closing stale connection:', error);
        }
        this.connections.delete(id);
      }
    }
  }
}
```

---

## Troubleshooting Guides

### 1. Worker Deployment Issues

#### Issue: "Module not found" during deployment
**Symptoms:**
- Build succeeds locally but fails during deployment
- Error mentions missing modules or dependencies

**Diagnosis Steps:**
```bash
# 1. Check if dependencies are properly installed
npm ls

# 2. Verify TypeScript compilation
npm run build

# 3. Check for peer dependency issues
npm ls --depth=0

# 4. Verify Wrangler configuration
wrangler dev --local

# 5. Check compatibility flags
wrangler dev --compatibility-date=2024-12-01
```

**Common Fixes:**
```bash
# Fix 1: Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Fix 2: Update Wrangler
npm install -g wrangler@latest

# Fix 3: Check compatibility settings
# Update wrangler.toml:
compatibility_date = "2024-12-01"
compatibility_flags = ["nodejs_compat"]

# Fix 4: Verify exports in package.json
# Ensure proper module exports
```

#### Issue: "Binding not found" errors
**Symptoms:**
- Worker deploys but fails at runtime
- References to KV, D1, or R2 fail

**Diagnosis:**
```bash
# 1. List actual bindings
wrangler kv:namespace list
wrangler d1 list
wrangler r2 bucket list

# 2. Compare with wrangler.toml
cat wrangler.toml | grep -A 10 "binding"

# 3. Check environment-specific configs
wrangler deploy --dry-run --env production
```

**Solution:**
```toml
# Ensure bindings match code expectations
[env.production]
kv_namespaces = [
  { binding = "USER_KV", id = "actual-kv-namespace-id" }
]

[[d1_databases]]
binding = "AUTH_DB"
database_name = "mustbeviral-prod-auth"
database_id = "actual-database-id"
```

### 2. Database Connection Issues

#### Issue: "Database is locked" errors
**Symptoms:**
- Intermittent database errors
- Queries timing out
- "Database is locked" messages

**Diagnosis:**
```typescript
// Add connection monitoring
class DatabaseMonitor {
  async checkConnection(db: D1Database): Promise<boolean> {
    try {
      const result = await db.prepare('SELECT 1 as test').first();
      return result?.test === 1;
    } catch (error) {
      console.error('Database connection check failed:', error);
      return false;
    }
  }

  async getDatabaseStats(db: D1Database): Promise<any> {
    try {
      return await db.prepare(`
        SELECT
          COUNT(*) as total_connections,
          (SELECT COUNT(*) FROM pragma_locks) as active_locks
      `).first();
    } catch (error) {
      console.error('Failed to get database stats:', error);
      return null;
    }
  }
}
```

**Solutions:**
```typescript
// 1. Implement connection pooling
class ConnectionPool {
  private connections: D1Database[] = [];
  private maxConnections = 10;

  async getConnection(): Promise<D1Database> {
    if (this.connections.length < this.maxConnections) {
      return this.createConnection();
    }

    // Wait for available connection
    return this.waitForConnection();
  }

  async releaseConnection(db: D1Database): Promise<void> {
    // Return connection to pool
    this.connections.push(db);
  }
}

// 2. Add retry logic for locked database
async function executeWithRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (error instanceof Error &&
          error.message.includes('database is locked') &&
          attempt < maxRetries) {

        const delay = Math.min(100 * Math.pow(2, attempt), 1000);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }

  throw new Error('Operation failed after maximum retries');
}
```

### 3. Authentication Problems

#### Issue: JWT tokens invalid or expired
**Symptoms:**
- Users randomly logged out
- "Invalid token" errors
- Authentication works intermittently

**Diagnosis:**
```typescript
// Add token debugging
class TokenDebugger {
  static decodeTokenPayload(token: string): any {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        throw new Error('Invalid token format');
      }

      const payload = JSON.parse(atob(parts[1]));

      console.log('Token payload:', {
        iss: payload.iss,
        sub: payload.sub,
        iat: new Date(payload.iat * 1000),
        exp: new Date(payload.exp * 1000),
        isExpired: payload.exp * 1000 < Date.now()
      });

      return payload;
    } catch (error) {
      console.error('Failed to decode token:', error);
      throw new Error('Invalid token format');
    }
  }

  static validateTokenStructure(token: string): boolean {
    const parts = token.split('.');
    if (parts.length !== 3) return false;

    try {
      // Validate header
      JSON.parse(atob(parts[0]));
      // Validate payload
      JSON.parse(atob(parts[1]));
      return true;
    } catch {
      return false;
    }
  }
}
```

**Solutions:**
```typescript
// 1. Implement token refresh logic
class AuthService {
  async verifyTokenWithRefresh(
    token: string,
    refreshToken: string
  ): Promise<AuthResult> {
    try {
      const payload = await this.verifyToken(token);
      return { valid: true, payload, refreshed: false };
    } catch (error) {
      if (error instanceof TokenExpiredError) {
        // Try to refresh token
        const newTokens = await this.refreshTokens(refreshToken);
        const payload = await this.verifyToken(newTokens.accessToken);

        return {
          valid: true,
          payload,
          refreshed: true,
          newTokens
        };
      }

      throw error;
    }
  }

  async refreshTokens(refreshToken: string): Promise<TokenPair> {
    const payload = await this.verifyRefreshToken(refreshToken);

    const newAccessToken = await this.generateAccessToken(payload.userId);
    const newRefreshToken = await this.generateRefreshToken(payload.userId);

    // Invalidate old refresh token
    await this.revokeRefreshToken(refreshToken);

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken
    };
  }
}

// 2. Add token blacklist for security
class TokenBlacklist {
  private blacklist = new Set<string>();

  async isTokenBlacklisted(jti: string): Promise<boolean> {
    return this.blacklist.has(jti) ||
           await this.env.KV.get(`blacklist:${jti}`) !== null;
  }

  async blacklistToken(jti: string, expiresAt: number): Promise<void> {
    this.blacklist.add(jti);

    const ttl = expiresAt - Math.floor(Date.now() / 1000);
    if (ttl > 0) {
      await this.env.KV.put(`blacklist:${jti}`, '1', { expirationTtl: ttl });
    }
  }
}
```

---

## Error Resolution

### 1. Common Error Patterns

#### Error: "DOMException: The script will never generate a response"
**Cause:** Worker doesn't return a Response object
```typescript
// ❌ Missing return statement
export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method === 'POST') {
      await processRequest(request);
      // Missing return - causes DOMException
    }

    return new Response('OK');
  }
};
```

**Fix:**
```typescript
// ✅ Always return Response
export default {
  async fetch(request: Request): Promise<Response> {
    try {
      if (request.method === 'POST') {
        const result = await processRequest(request);
        return new Response(JSON.stringify(result), {
          headers: { 'Content-Type': 'application/json' }
        });
      }

      return new Response('Method not allowed', { status: 405 });
    } catch (error) {
      console.error('Request failed:', error);
      return new Response('Internal Server Error', { status: 500 });
    }
  }
};
```

#### Error: "TypeError: Cannot read property 'get' of undefined"
**Cause:** Accessing undefined environment bindings
```typescript
// ❌ Binding not defined or misconfigured
await env.MY_KV.get('key'); // MY_KV is undefined
```

**Fix:**
```typescript
// ✅ Validate environment bindings
function validateEnvironment(env: any): asserts env is Env {
  const required = ['MY_KV', 'AUTH_DB', 'API_URL'];

  for (const key of required) {
    if (!env[key]) {
      throw new Error(`Missing required environment binding: ${key}`);
    }
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    validateEnvironment(env);

    // Now safe to use bindings
    const value = await env.MY_KV.get('key');
    return new Response(value);
  }
};
```

### 2. Error Monitoring

#### Comprehensive Error Tracking
```typescript
// Error tracking with context
class ErrorTracker {
  static async trackError(
    error: Error,
    context: ErrorContext,
    env: Env
  ): Promise<void> {
    const errorInfo = {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      context: {
        requestId: context.requestId,
        userId: context.userId,
        endpoint: context.endpoint,
        userAgent: context.userAgent,
        ip: context.ip
      },
      environment: env.ENVIRONMENT || 'unknown'
    };

    // Log to console
    console.error('Application Error:', errorInfo);

    // Store in KV for analysis
    await env.ERROR_LOGS.put(
      `error:${Date.now()}:${context.requestId}`,
      JSON.stringify(errorInfo),
      { expirationTtl: 7 * 24 * 60 * 60 } // 7 days
    );

    // Send to external monitoring (if configured)
    if (env.SENTRY_DSN) {
      await this.sendToSentry(errorInfo, env.SENTRY_DSN);
    }
  }

  private static async sendToSentry(
    errorInfo: any,
    sentryDsn: string
  ): Promise<void> {
    try {
      const sentryPayload = {
        message: errorInfo.message,
        level: 'error',
        extra: errorInfo.context,
        tags: {
          environment: errorInfo.environment
        }
      };

      await fetch(`${sentryDsn}/api/store/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sentryPayload)
      });
    } catch (sentryError) {
      console.error('Failed to send error to Sentry:', sentryError);
    }
  }
}
```

---

## Monitoring & Debugging

### 1. Performance Monitoring

#### Worker Performance Metrics
```typescript
class PerformanceMonitor {
  private metrics = new Map<string, PerformanceMetric>();

  startTimer(operation: string): PerformanceTimer {
    const startTime = Date.now();
    const startMemory = (performance as any).memory?.usedJSHeapSize || 0;

    return {
      end: () => {
        const endTime = Date.now();
        const endMemory = (performance as any).memory?.usedJSHeapSize || 0;

        const metric = {
          duration: endTime - startTime,
          memoryDelta: endMemory - startMemory,
          timestamp: new Date().toISOString()
        };

        this.recordMetric(operation, metric);
        return metric;
      }
    };
  }

  private recordMetric(operation: string, metric: PerformanceMetric): void {
    const existing = this.metrics.get(operation);

    if (!existing) {
      this.metrics.set(operation, {
        ...metric,
        count: 1,
        totalDuration: metric.duration
      });
    } else {
      this.metrics.set(operation, {
        ...metric,
        count: existing.count + 1,
        totalDuration: existing.totalDuration + metric.duration,
        avgDuration: (existing.totalDuration + metric.duration) / (existing.count + 1)
      });
    }
  }

  getMetrics(): Record<string, PerformanceMetric> {
    return Object.fromEntries(this.metrics);
  }
}

// Usage
const monitor = new PerformanceMonitor();

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const timer = monitor.startTimer('request_processing');

    try {
      const result = await processRequest(request, env);
      return result;
    } finally {
      const metrics = timer.end();

      if (metrics.duration > 1000) {
        console.warn(`Slow request detected: ${metrics.duration}ms`);
      }
    }
  }
};
```

### 2. Debugging Tools

#### Request Debugging
```typescript
class RequestDebugger {
  static logRequest(request: Request, context: any = {}): void {
    if (process.env.NODE_ENV !== 'development') return;

    const debugInfo = {
      url: request.url,
      method: request.method,
      headers: Object.fromEntries(request.headers),
      context,
      timestamp: new Date().toISOString()
    };

    console.log('🔍 Request Debug:', debugInfo);
  }

  static async logRequestBody(request: Request): Promise<any> {
    if (process.env.NODE_ENV !== 'development') return null;

    try {
      const cloned = request.clone();
      const body = await cloned.text();

      let parsed;
      try {
        parsed = JSON.parse(body);
      } catch {
        parsed = body;
      }

      console.log('📄 Request Body:', parsed);
      return parsed;
    } catch (error) {
      console.error('Failed to log request body:', error);
      return null;
    }
  }

  static logResponse(response: Response, duration: number): void {
    if (process.env.NODE_ENV !== 'development') return;

    console.log('📤 Response Debug:', {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers),
      duration: `${duration}ms`,
      timestamp: new Date().toISOString()
    });
  }
}
```

---

## Developer Onboarding

### 1. Local Development Setup

#### Quick Start Guide
```bash
# 1. Clone repository
git clone https://github.com/your-org/must-be-viral-v2.git
cd must-be-viral-v2

# 2. Install dependencies
npm install
cd mustbeviral && npm install && cd ..

# 3. Set up environment
cp .env.example .env.local
# Fill in required environment variables

# 4. Set up Wrangler
npm install -g wrangler@latest
wrangler auth login

# 5. Create local databases
wrangler d1 create mustbeviral-dev-auth
wrangler d1 create mustbeviral-dev-content
wrangler d1 create mustbeviral-dev-analytics

# 6. Run migrations
cd workers/auth-worker
wrangler d1 migrations apply mustbeviral-dev-auth --local

# 7. Start development servers
npm run dev # Start all services
```

#### Development Workflow
```bash
# Daily workflow
git pull origin main
npm install # If package.json changed
npm run test # Run tests before changes
npm run dev # Start development

# Making changes
git checkout -b feature/your-feature
# Make changes
npm run test # Ensure tests pass
npm run lint # Check code style
git commit -m "feat: add your feature"
git push origin feature/your-feature
# Create pull request
```

### 2. Code Style Guide

#### TypeScript Best Practices
```typescript
// ✅ Good: Use interfaces for objects
interface User {
  readonly id: string;
  readonly email: string;
  readonly username: string;
  readonly role: 'creator' | 'influencer' | 'admin';
}

// ✅ Good: Use type guards
function isUser(obj: any): obj is User {
  return obj &&
    typeof obj.id === 'string' &&
    typeof obj.email === 'string' &&
    typeof obj.username === 'string' &&
    ['creator', 'influencer', 'admin'].includes(obj.role);
}

// ✅ Good: Use enums for constants
enum ContentType {
  ARTICLE = 'article',
  SOCIAL_POST = 'social_post',
  HEADLINE = 'headline',
  DESCRIPTION = 'description'
}

// ✅ Good: Handle errors properly
async function fetchUser(id: string): Promise<User | null> {
  try {
    const response = await api.get(`/users/${id}`);

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`Failed to fetch user: ${response.status}`);
    }

    const data = await response.json();

    if (!isUser(data)) {
      throw new Error('Invalid user data received');
    }

    return data;
  } catch (error) {
    console.error(`Error fetching user ${id}:`, error);
    throw error;
  }
}
```

#### Error Handling Patterns
```typescript
// ✅ Custom error classes
class APIError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public code?: string
  ) {
    super(message);
    this.name = 'APIError';
  }
}

class ValidationError extends Error {
  constructor(
    message: string,
    public field: string,
    public value: any
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

// ✅ Result pattern for better error handling
type Result<T, E = Error> = {
  success: true;
  data: T;
} | {
  success: false;
  error: E;
};

async function safeApiCall<T>(operation: () => Promise<T>): Promise<Result<T>> {
  try {
    const data = await operation();
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error))
    };
  }
}
```

### 3. Testing Guidelines

#### Unit Test Examples
```typescript
// Example test file
import { describe, it, expect, beforeEach } from 'vitest';
import { AuthService } from '../src/services/AuthService';

describe('AuthService', () => {
  let authService: AuthService;
  let mockEnv: Env;

  beforeEach(() => {
    mockEnv = {
      JWT_SECRET: 'test-secret',
      AUTH_DB: createMockDatabase(),
      // ... other mocks
    };

    authService = new AuthService(mockEnv);
  });

  describe('validatePassword', () => {
    it('should accept valid passwords', () => {
      const result = authService.validatePassword('SecurePass123!');

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.strength).toBe('strong');
    });

    it('should reject weak passwords', () => {
      const result = authService.validatePassword('weak');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must be at least 8 characters long');
      expect(result.strength).toBe('weak');
    });
  });

  describe('generateToken', () => {
    it('should generate valid JWT tokens', async () => {
      const user = createTestUser();
      const token = await authService.generateToken(user);

      expect(token).toMatch(/^[\w-]+\.[\w-]+\.[\w-]+$/);

      const decoded = await authService.verifyToken(token);
      expect(decoded?.id).toBe(user.id);
    });
  });
});
```

### 4. Documentation Standards

#### Code Documentation
```typescript
/**
 * Generates AI-powered content based on user requirements
 *
 * @param request - Content generation request with topic, tone, and audience
 * @param options - Optional generation settings
 * @returns Promise resolving to generated content with metadata
 *
 * @throws {ValidationError} When request parameters are invalid
 * @throws {RateLimitError} When user exceeds generation limits
 * @throws {AIServiceError} When AI service is unavailable
 *
 * @example
 * ```typescript
 * const content = await generateContent({
 *   type: 'social_post',
 *   topic: 'sustainable fashion',
 *   tone: 'professional',
 *   audience: 'professionals'
 * });
 *
 * console.log(content.text); // Generated content
 * console.log(content.viralScore); // 0.85
 * ```
 */
async function generateContent(
  request: ContentGenerationRequest,
  options: GenerationOptions = {}
): Promise<GeneratedContent> {
  // Implementation...
}
```

---

*Last Updated: January 2025*

**This gotchas and troubleshooting guide should be your first stop when encountering issues. Keep it updated as you discover new patterns and solutions.**