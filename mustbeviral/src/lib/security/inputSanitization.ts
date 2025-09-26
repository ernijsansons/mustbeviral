/**
 * Comprehensive Input Sanitization Service
 * Fortune 50-grade security for preventing XSS, SQL injection, and other attacks
 */

import DOMPurify from 'isomorphic-dompurify';

export interface SanitizationOptions {
  allowedTags?: string[];
  allowedAttributes?: Record<string, string[]>;
  stripScripts?: boolean;
  stripStyles?: boolean;
  stripEvents?: boolean;
  maxLength?: number;
  allowUrls?: boolean;
  allowEmails?: boolean;
}

export class InputSanitizer {
  // Dangerous patterns to detect and block
  private static readonly DANGEROUS_PATTERNS = {
    sqlInjection: /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/gi,
    scriptTags: /<script[^>]*>.*?<\/script>/gis,
    eventHandlers: /\bon\w+\s*=/gi,
    dataUri: /data:[^,]*base64/gi,
    javascript: /javascript:/gi,
    vbscript: /vbscript:/gi,
    iframeTags: /<iframe[^>]*>.*?<\/iframe>/gis,
    objectTags: /<object[^>]*>.*?<\/object>/gis,
    embedTags: /<embed[^>]*>/gi,
    metaTags: /<meta[^>]*>/gi,
    linkTags: /<link[^>]*>/gi,
    importStatements: /@import/gi,
    expressionBinding: /\{\{.*?\}\}/g,
    pathTraversal: /\.\.[\/\\]/g,
    commandInjection: /[;&|`$()]/g,
    nullBytes: /\0/g
  };

  /**
   * Sanitize HTML content
   */
  static sanitizeHtml(input: string, options: SanitizationOptions = {}): string {
    if (!input || typeof input !== 'string') {
      return '';
    }

    // Apply length limit
    if (options.maxLength && input.length > options.maxLength) {
      input = input.substring(0, options.maxLength);
    }

    // Configure DOMPurify
    const config: any = {
      ALLOWED_TAGS: options.allowedTags || ['p', 'br', 'strong', 'em', 'u', 'a', 'ul', 'ol', 'li'],
      ALLOWED_ATTR: options.allowedAttributes || { 'a': ['href', 'target'] },
      ALLOW_DATA_ATTR: false,
      FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form'],
      FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover'],
      KEEP_CONTENT: true,
      SAFE_FOR_TEMPLATES: true,
      SANITIZE_DOM: true,
      WHOLE_DOCUMENT: false,
      RETURN_DOM: false,
      RETURN_DOM_FRAGMENT: false,
      RETURN_TRUSTED_TYPE: false
    };

    // Sanitize with DOMPurify
    let sanitized = DOMPurify.sanitize(input, config);

    // Additional security layers
    if (options.stripScripts !== false) {
      sanitized = sanitized.replace(this.DANGEROUS_PATTERNS.scriptTags, '');
      sanitized = sanitized.replace(this.DANGEROUS_PATTERNS.javascript, '');
      sanitized = sanitized.replace(this.DANGEROUS_PATTERNS.vbscript, '');
    }

    if (options.stripEvents !== false) {
      sanitized = sanitized.replace(this.DANGEROUS_PATTERNS.eventHandlers, '');
    }

    if (options.stripStyles !== false) {
      sanitized = sanitized.replace(/<style[^>]*>.*?<\/style>/gis, '');
      sanitized = sanitized.replace(/style\s*=\s*"[^"]*"/gi, '');
    }

    // Remove dangerous URI schemes
    if (!options.allowUrls) {
      sanitized = sanitized.replace(/href\s*=\s*["']?javascript:[^"'>]*/gi, 'href="#"');
      sanitized = sanitized.replace(/href\s*=\s*["']?data:[^"'>]*/gi, 'href="#"');
    }

    return sanitized.trim();
  }

  /**
   * Sanitize plain text input
   */
  static sanitizeText(input: string, maxLength: number = 10000): string {
    if (!input || typeof input !== 'string') {
      return '';
    }

    // Remove null bytes
    let sanitized = input.replace(this.DANGEROUS_PATTERNS.nullBytes, '');

    // Escape HTML entities
    sanitized = sanitized
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');

    // Apply length limit
    if (sanitized.length > maxLength) {
      sanitized = sanitized.substring(0, maxLength);
    }

    return sanitized.trim();
  }

  /**
   * Sanitize JSON input
   */
  static sanitizeJson(input: string): object | null {
    if (!input || typeof input !== 'string') {
      return null;
    }

    try {
      // Remove comments and trailing commas (common JSON attacks)
      const cleaned = input
        .replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '') // Remove comments
        .replace(/,\s*([}\]])/g, '$1'); // Remove trailing commas

      const parsed = JSON.parse(cleaned);

      // Recursively sanitize string values
      return this.sanitizeJsonObject(parsed);
    } catch (error) {
      console.error('Invalid JSON input:', error);
      return null;
    }
  }

  /**
   * Recursively sanitize JSON object values
   */
  private static sanitizeJsonObject(obj: any): any {
    if (typeof obj === 'string') {
      return this.sanitizeText(obj);
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeJsonObject(item));
    }

    if (obj && typeof obj === 'object') {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(obj)) {
        // Sanitize key
        const sanitizedKey = this.sanitizeText(key, 100);
        // Sanitize value
        sanitized[sanitizedKey] = this.sanitizeJsonObject(value);
      }
      return sanitized;
    }

    return obj;
  }

  /**
   * Sanitize SQL query parameters
   */
  static sanitizeSqlParam(input: string): string {
    if (!input || typeof input !== 'string') {
      return '';
    }

    // Escape special SQL characters
    let sanitized = input
      .replace(/'/g, "''") // Escape single quotes
      .replace(/\\/g, '\\\\') // Escape backslashes
      .replace(/\0/g, '') // Remove null bytes
      .replace(/\n/g, '\\n') // Escape newlines
      .replace(/\r/g, '\\r') // Escape carriage returns
      .replace(/\x1a/g, '\\Z'); // Escape SUB character

    // Check for SQL injection patterns
    if (this.DANGEROUS_PATTERNS.sqlInjection.test(sanitized)) {
      console.warn('Potential SQL injection attempt detected');
      // Remove dangerous keywords
      sanitized = sanitized.replace(this.DANGEROUS_PATTERNS.sqlInjection, '');
    }

    return sanitized;
  }

  /**
   * Sanitize file names
   */
  static sanitizeFileName(fileName: string): string {
    if (!fileName || typeof fileName !== 'string') {
      return 'unnamed';
    }

    // Remove path traversal attempts
    let sanitized = fileName.replace(this.DANGEROUS_PATTERNS.pathTraversal, '');

    // Remove dangerous characters
    sanitized = sanitized.replace(/[<>:"|?*\x00-\x1f]/g, '');

    // Limit length
    if (sanitized.length > 255) {
      const extension = sanitized.split('.').pop();
      sanitized = sanitized.substring(0, 240) + (extension ? `.${extension}` : '');
    }

    return sanitized || 'unnamed';
  }

  /**
   * Sanitize URL
   */
  static sanitizeUrl(url: string): string | null {
    if (!url || typeof url !== 'string') {
      return null;
    }

    try {
      const parsed = new URL(url);

      // Allow only safe protocols
      const allowedProtocols = ['http:', 'https:', 'mailto:'];
      if (!allowedProtocols.includes(parsed.protocol)) {
        return null;
      }

      // Check for suspicious patterns
      if (
        this.DANGEROUS_PATTERNS.javascript.test(url) ||
        this.DANGEROUS_PATTERNS.dataUri.test(url) ||
        this.DANGEROUS_PATTERNS.vbscript.test(url)
      ) {
        return null;
      }

      return parsed.toString();
    } catch {
      return null;
    }
  }

  /**
   * Sanitize email address
   */
  static sanitizeEmail(email: string): string | null {
    if (!email || typeof email !== 'string') {
      return null;
    }

    // Basic email validation and sanitization
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    const sanitized = email.trim().toLowerCase();

    if (!emailRegex.test(sanitized)) {
      return null;
    }

    // Check for suspicious patterns
    if (
      this.DANGEROUS_PATTERNS.scriptTags.test(sanitized) ||
      this.DANGEROUS_PATTERNS.sqlInjection.test(sanitized)
    ) {
      return null;
    }

    return sanitized;
  }

  /**
   * Validate and sanitize numeric input
   */
  static sanitizeNumber(input: any, min?: number, max?: number): number | null {
    const num = Number(input);

    if (isNaN(num) || !isFinite(num)) {
      return null;
    }

    if (min !== undefined && num < min) {
      return min;
    }

    if (max !== undefined && num > max) {
      return max;
    }

    return num;
  }

  /**
   * Sanitize array of strings
   */
  static sanitizeArray(input: any[], sanitizer: (item: any) => any): any[] {
    if (!Array.isArray(input)) {
      return [];
    }

    return input
      .map(item => sanitizer(item))
      .filter(item => item !== null && item !== undefined);
  }

  /**
   * Create a content security policy header
   */
  static generateCSPHeader(nonce: string): string {
    return [
      "default-src 'self'",
      `script-src 'self' 'nonce-${nonce}'`,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self'",
      "connect-src 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "upgrade-insecure-requests"
    ].join('; ');
  }

  /**
   * Detect potential security threats in input
   */
  static detectThreats(input: string): string[] {
    const threats: string[] = [];

    if (this.DANGEROUS_PATTERNS.sqlInjection.test(input)) {
      threats.push('SQL Injection');
    }

    if (this.DANGEROUS_PATTERNS.scriptTags.test(input)) {
      threats.push('Script Injection');
    }

    if (this.DANGEROUS_PATTERNS.eventHandlers.test(input)) {
      threats.push('Event Handler Injection');
    }

    if (this.DANGEROUS_PATTERNS.pathTraversal.test(input)) {
      threats.push('Path Traversal');
    }

    if (this.DANGEROUS_PATTERNS.commandInjection.test(input)) {
      threats.push('Command Injection');
    }

    return threats;
  }
}

export default InputSanitizer;