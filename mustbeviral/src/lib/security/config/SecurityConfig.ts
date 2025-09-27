/**
 * Security Configuration Factory
 * Grug-approved: Simple config creation from environment variables
 * No complex patterns, just straightforward config building
 */

import { SecurityConfig } from '../types/SecurityTypes'

export function createSecurityConfig(): SecurityConfig {
  return {
    jwt: {
      secret: getEnvVar('JWT_SECRET', 'default-secret-change-me'),
      algorithm: 'HS256',
      expiresIn: '1h',
      refreshSecret: getEnvVar('JWT_REFRESH_SECRET', 'refresh-secret-change-me'),
      cacheSize: 10000,
      cacheTTL: 3600 // 1 hour
    },
    rateLimit: {
      windowMs: 60000, // 1 minute
      maxRequests: 100,
      skipSuccessfulRequests: false,
      enableDistributed: true,
      redisUrl: process.env.REDISURL
    },
    csrf: {
      enabled: isProduction(),
      cookieName: '_csrf',
      headerName: 'X-CSRF-Token',
      secretLength: 32
    },
    cors: {
      enabled: true,
      origins: getAllowedOrigins(),
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-CSRF-Token']
    },
    validation: {
      maxBodySize: '10mb',
      enableSanitization: true,
      enableXssProtection: true
    },
    session: {
      secret: getEnvVar('SESSION_SECRET', 'session-secret-change-me'),
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      secure: isProduction(),
      httpOnly: true,
      sameSite: 'strict'
    }
  }
}

function getEnvVar(name: string, defaultValue: string): string {
  return process.env[name] ?? defaultValue
}

function isProduction(): boolean {
  return process.env.NODEENV === 'production'
}

function getAllowedOrigins(): string[] {
  const origins = process.env.ALLOWED_ORIGINS
  if (origins) {
    return origins.split(',').map(origin => origin.trim())
  }
  return ['http://localhost:3000']
}