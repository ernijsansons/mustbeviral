/**
 * Input Sanitization Service
 * Grug-approved: Simple XSS protection and input cleaning
 * Basic sanitization that prevents common attacks
 */

import { Request } from 'express'
import { SecurityConfig } from '../types/SecurityTypes'

export class InputSanitizationService {
  constructor(private config: SecurityConfig) {}

  sanitizeRequest(req: Request): void {
    if (!this.config.validation.enableSanitization) {
      return
    }

    this.sanitizeBody(req)
    this.sanitizeQuery(req)
    this.sanitizeParams(req)
  }

  private sanitizeBody(req: Request): void {
    if (req.body) {
      this.sanitizeObject(req.body)
    }
  }

  private sanitizeQuery(req: Request): void {
    if (req.query) {
      this.sanitizeObject(req.query)
    }
  }

  private sanitizeParams(req: Request): void {
    if (req.params) {
      this.sanitizeObject(req.params)
    }
  }

  private sanitizeObject(obj: any): void {
    for (const key in obj) {
      if (this.isString(obj[key])) {
        obj[key] = this.sanitizeString(obj[key])
      } else if (this.isObject(obj[key])) {
        this.sanitizeObject(obj[key])
      }
    }
  }

  private sanitizeString(value: string): string {
    return value
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;')
  }

  private isString(value: any): boolean {
    return typeof value === 'string'
  }

  private isObject(value: any): boolean {
    return typeof value === 'object' && value !== null
  }
}