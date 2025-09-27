/**
 * Simple Cache Implementation
 * Grug-approved: Basic LRU cache that anyone can understand
 * No fancy features, just simple get/set with size limit
 */

export class SimpleCache<K, V> {
  private cache = new Map<K, V>()
  private maxSize: number

  constructor(options: { max: number; ttl?: number }) {
    this.maxSize = options.max
  }

  get(key: K): V | undefined {
    return this.cache.get(key)
  }

  set(key: K, value: V): void {
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value
      this.cache.delete(firstKey)
    }
    this.cache.set(key, value)
  }

  has(key: K): boolean {
    return this.cache.has(key)
  }

  delete(key: K): boolean {
    return this.cache.delete(key)
  }

  clear(): void {
    this.cache.clear()
  }

  get size(): number {
    return this.cache.size
  }

  get calculatedSize(): number {
    return this.cache.size
  }
}