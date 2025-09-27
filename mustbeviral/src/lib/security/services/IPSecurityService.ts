/**
 * IP Security Service
 * Grug-approved: Simple IP allowlist/blocklist checking
 * Clear logic for IP-based security decisions
 */

import { SimpleCache } from '../cache/SimpleCache'

export class IPSecurityService {
  private ipWhitelist: Set<string>
  private ipBlacklist: Set<string>
  private blacklistCache: SimpleCache<string, boolean>

  constructor() {
    this.ipWhitelist = new Set()
    this.ipBlacklist = new Set()
    this.blacklistCache = new SimpleCache({ max: 100000, ttl: 3600000 })
    this.loadIPLists()
  }

  async checkIPSecurity(ipAddress: string): Promise<boolean> {
    if (this.isWhitelisted(ipAddress)) {
      return true
    }

    if (this.isBlacklisted(ipAddress)) {
      return false
    }

    if (this.isCachedAsBlocked(ipAddress)) {
      return false
    }

    return true // Allow by default
  }

  addToWhitelist(ipAddress: string): void {
    this.ipWhitelist.add(ipAddress)
  }

  addToBlacklist(ipAddress: string): void {
    this.ipBlacklist.add(ipAddress)
    this.blacklistCache.set(ipAddress, true)
  }

  removeFromWhitelist(ipAddress: string): void {
    this.ipWhitelist.delete(ipAddress)
  }

  removeFromBlacklist(ipAddress: string): void {
    this.ipBlacklist.delete(ipAddress)
    this.blacklistCache.delete(ipAddress)
  }

  getWhitelistSize(): number {
    return this.ipWhitelist.size
  }

  getBlacklistSize(): number {
    return this.ipBlacklist.size
  }

  private isWhitelisted(ipAddress: string): boolean {
    return this.ipWhitelist.has(ipAddress)
  }

  private isBlacklisted(ipAddress: string): boolean {
    return this.ipBlacklist.has(ipAddress)
  }

  private isCachedAsBlocked(ipAddress: string): boolean {
    return this.blacklistCache.has(ipAddress)
  }

  private loadIPLists(): void {
    this.loadWhitelistFromEnv()
    this.loadBlacklistFromEnv()
  }

  private loadWhitelistFromEnv(): void {
    const whitelistEnv = process.env.IP_WHITELIST
    if (whitelistEnv) {
      const ips = whitelistEnv.split(',')
      for (const ip of ips) {
        this.ipWhitelist.add(ip.trim())
      }
    }
  }

  private loadBlacklistFromEnv(): void {
    const blacklistEnv = process.env.IP_BLACKLIST
    if (blacklistEnv) {
      const ips = blacklistEnv.split(',')
      for (const ip of ips) {
        this.ipBlacklist.add(ip.trim())
      }
    }
  }
}