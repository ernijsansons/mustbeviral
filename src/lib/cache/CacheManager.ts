// Simple Cache Manager for KV storage
export class CacheManager {
  constructor(private kv: KVNamespace) {}

  async get(key: string): Promise<string | null> {
    try {
      return await this.kv.get(key);
    } catch (error: unknown) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  async set(key: string, value: string, ttl?: number): Promise<void> {
    try {
      const options = ttl ? { expirationTtl: ttl } : undefined;
      await this.kv.put(key, value, options);
    } catch (error: unknown) {
      console.error('Cache set error:', error);
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await this.kv.delete(key);
    } catch (error: unknown) {
      console.error('Cache delete error:', error);
    }
  }
}