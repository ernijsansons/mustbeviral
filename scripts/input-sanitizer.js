#!/usr/bin/env node

/**
 * Advanced Input Sanitization and Validation Library
 * Protects against XSS, SQL injection, command injection, and other attacks
 * Enterprise-grade security patterns for Must Be Viral V2
 */

const crypto = require('crypto');

class InputSanitizer {
  constructor(options = {}) {
    this.options = {
      strictMode: options.strictMode || true,
      logSecurityEvents: options.logSecurityEvents || true,
      maxStringLength: options.maxStringLength || 10000,
      allowedTags: options.allowedTags || [],
      allowedAttributes: options.allowedAttributes || [],
      ...options
    };
    
    // Security patterns for detection
    this.securityPatterns = {
      sqlInjection: [
        /(\bselect\b|\bunion\b|\binsert\b|\bupdate\b|\bdelete\b|\bdrop\b|\bcreate\b|\balter\b).*(\bfrom\b|\binto\b|\bset\b|\bwhere\b)/i,
        /('|(\\'))|(;)|(\/\*(\*(?!\/)|[^*])*\*\/)/,
        /((\%27)|(\'))\s*(\%6F|\%4F|o|O)(\%52|\%72|r|R)/i,
        /((\%27)|(\'))\s*(\%75|\%55|u|U)(\%6E|\%4E|n|N)(\%69|\%49|i|I)(\%6F|\%4F|o|O)(\%6E|\%4E|n|N)/i
      ],
      xss: [
        /<script[^>]*>[\s\S]*?<\/script>/gi,
        /<iframe[^>]*>[\s\S]*?<\/iframe>/gi,
        /javascript:/gi,
        /on\w+\s*=/gi,
        /<object[^>]*>[\s\S]*?<\/object>/gi,
        /<embed[^>]*>/gi,
        /<meta[^>]*>/gi,
        /expression\s*\(/gi
      ],
      commandInjection: [
        /[;&|`$\(\)]/,
        /(^|\s)(ls|cat|pwd|whoami|id|ps|netstat|ifconfig|uname|chmod|chown|rm|mv|cp|mkdir|rmdir|find|grep|awk|sed|wget|curl|nc|telnet|ssh|ftp|sudo|su)\s/i,
        /\$(PATH|HOME|USER|SHELL|PWD)/i,
        /\.\.\//
      ],
      pathTraversal: [
        /\.\.\/|\.\.\\/,
        /(^|\/)\.\.($|\/)/,
        /(^|\\)\.\.($|\\)/,
        /%2e%2e/i,
        /%252e%252e/i
      ]
    };

    // Safe character whitelist
    this.safeCharacters = /^[a-zA-Z0-9\s\.\,\!\?\-\_\@\#\$\%\^\&\*\(\)\+\=\[\]\{\}\|\;\:\'\"\<\>\~\`]*$/;
  }

  /**
   * Main sanitization method
   * @param {any} input - Input to sanitize
   * @param {string} type - Type of input (email, url, text, html, etc.)
   * @param {object} options - Additional options
   * @returns {object} - {value, isValid, threats}
   */
  sanitize(input, type = 'text', options = {}) {
    const result = {
      value: null,
      isValid: true,
      threats: [],
      warnings: [],
      sanitized: false
    };

    try {
      // Initial validation
      if (input === null || input === undefined) {
        result.value = '';
        return result;
      }

      // Convert to string and check length
      let sanitized = String(input);
      if (sanitized.length > this.options.maxStringLength) {
        result.threats.push('Input exceeds maximum length limit');
        result.isValid = false;
        sanitized = sanitized.substring(0, this.options.maxStringLength);
        result.sanitized = true;
      }

      // Detect security threats
      const threats = this.detectThreats(sanitized);
      if (threats.length > 0) {
        result.threats = threats;
        if (this.options.strictMode) {
          result.isValid = false;
        }
      }

      // Type-specific sanitization
      switch (type.toLowerCase()) {
        case 'email':
          sanitized = this.sanitizeEmail(sanitized);
          break;
        case 'url':
          sanitized = this.sanitizeUrl(sanitized);
          break;
        case 'html':
          sanitized = this.sanitizeHtml(sanitized);
          break;
        case 'sql':
          sanitized = this.sanitizeSql(sanitized);
          break;
        case 'filename':
          sanitized = this.sanitizeFilename(sanitized);
          break;
        case 'number':
          sanitized = this.sanitizeNumber(sanitized);
          break;
        default:
          sanitized = this.sanitizeText(sanitized);
      }

      result.value = sanitized;
      if (sanitized !== String(input)) {
        result.sanitized = true;
      }

      // Log security events
      if (this.options.logSecurityEvents && result.threats.length > 0) {
        this.logSecurityEvent(input, type, result.threats);
      }

      return result;

    } catch (error) {
      result.isValid = false;
      result.threats.push(`Sanitization error: ${error.message}`);
      result.value = '';
      return result;
    }
  }

  /**
   * Detect security threats in input
   */
  detectThreats(input) {
    const threats = [];
    const inputLower = input.toLowerCase();

    // Check SQL injection patterns
    for (const pattern of this.securityPatterns.sqlInjection) {
      if (pattern.test(input)) {
        threats.push('Potential SQL injection detected');
        break;
      }
    }

    // Check XSS patterns
    for (const pattern of this.securityPatterns.xss) {
      if (pattern.test(input)) {
        threats.push('Potential XSS attack detected');
        break;
      }
    }

    // Check command injection patterns
    for (const pattern of this.securityPatterns.commandInjection) {
      if (pattern.test(input)) {
        threats.push('Potential command injection detected');
        break;
      }
    }

    // Check path traversal patterns
    for (const pattern of this.securityPatterns.pathTraversal) {
      if (pattern.test(input)) {
        threats.push('Potential path traversal attack detected');
        break;
      }
    }

    return threats;
  }

  /**
   * Sanitize email addresses
   */
  sanitizeEmail(input) {
    // Remove dangerous characters
    let sanitized = input.replace(/[<>"']/g, '');
    
    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(sanitized)) {
      return '';
    }

    return sanitized.toLowerCase().trim();
  }

  /**
   * Sanitize URLs
   */
  sanitizeUrl(input) {
    let sanitized = input.trim();
    
    // Remove javascript: and data: schemes
    sanitized = sanitized.replace(/^(javascript|data|vbscript):/gi, '');
    
    // Ensure URL starts with http:// or https://
    if (!/^https?:\/\//i.test(sanitized)) {
      if (sanitized.startsWith('//')) {
        sanitized = 'https:' + sanitized;
      } else if (sanitized.length > 0 && !sanitized.startsWith('#')) {
        sanitized = 'https://' + sanitized;
      }
    }

    // Validate URL format
    try {
      new URL(sanitized);
      return sanitized;
    } catch {
      return '';
    }
  }

  /**
   * Sanitize HTML content
   */
  sanitizeHtml(input) {
    // Remove all HTML tags except allowed ones
    let sanitized = input;
    
    // Remove script tags and their content
    sanitized = sanitized.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
    
    // Remove dangerous HTML elements
    const dangerousTags = ['script', 'object', 'embed', 'iframe', 'frame', 'applet', 'meta', 'link', 'style'];
    for (const tag of dangerousTags) {
      const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?<\\/${tag}>)?`, 'gi');
      sanitized = sanitized.replace(regex, '');
    }

    // Remove on* event handlers
    sanitized = sanitized.replace(/on\w+\s*=\s*["'][^"']*["']/gi, '');
    
    // Remove javascript: URLs
    sanitized = sanitized.replace(/href\s*=\s*["']javascript:[^"']*["']/gi, '');

    return sanitized;
  }

  /**
   * Sanitize SQL input (for parameterized queries)
   */
  sanitizeSql(input) {
    // Escape single quotes and remove SQL keywords in unexpected places
    let sanitized = input.replace(/'/g, "''");
    
    // Remove SQL comment markers
    sanitized = sanitized.replace(/--/g, '');
    sanitized = sanitized.replace(/\/\*[\s\S]*?\*\//g, '');
    
    // Remove potential injection keywords at the beginning
    sanitized = sanitized.replace(/^\s*(union|select|insert|update|delete|drop|create|alter|exec|execute)\s+/i, '');

    return sanitized.trim();
  }

  /**
   * Sanitize filenames
   */
  sanitizeFilename(input) {
    // Remove path traversal and dangerous characters
    let sanitized = input.replace(/[^\w\s\-\._]/g, '');
    
    // Remove leading dots and spaces
    sanitized = sanitized.replace(/^[\.\s]+/, '');
    
    // Limit length
    if (sanitized.length > 255) {
      sanitized = sanitized.substring(0, 255);
    }

    return sanitized || 'file';
  }

  /**
   * Sanitize numbers
   */
  sanitizeNumber(input) {
    const number = parseFloat(input);
    if (isNaN(number) || !isFinite(number)) {
      return 0;
    }
    return number;
  }

  /**
   * Sanitize general text
   */
  sanitizeText(input) {
    // Remove null bytes and control characters
    let sanitized = input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
    
    // Normalize whitespace
    sanitized = sanitized.replace(/\s+/g, ' ').trim();

    return sanitized;
  }

  /**
   * Log security events
   */
  logSecurityEvent(input, type, threats) {
    const event = {
      timestamp: new Date().toISOString(),
      type: 'SECURITY_EVENT',
      inputType: type,
      threats: threats,
      inputSample: input.length > 100 ? input.substring(0, 100) + '...' : input,
      hash: crypto.createHash('sha256').update(input).digest('hex').substring(0, 16)
    };

    console.warn('🚨 SECURITY EVENT:', JSON.stringify(event));
  }

  /**
   * Batch sanitize multiple inputs
   */
  sanitizeBatch(inputs, types = {}) {
    const results = {};
    
    for (const [key, value] of Object.entries(inputs)) {
      const type = types[key] || 'text';
      results[key] = this.sanitize(value, type);
    }

    return results;
  }

  /**
   * Validate sanitization result
   */
  isSecure(result) {
    return result.isValid && result.threats.length === 0;
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { InputSanitizer };
}

// CLI usage
if (require.main === module) {
  const sanitizer = new InputSanitizer({ strictMode: true });
  
  console.log('🔒 Input Sanitizer Security Test Suite');
  console.log('=' .repeat(50));

  const testCases = [
    { input: "'; DROP TABLE users; --", type: 'sql' },
    { input: '<script>alert("XSS")</script>', type: 'html' },
    { input: 'john.doe@example.com', type: 'email' },
    { input: 'javascript:alert("XSS")', type: 'url' },
    { input: '../../../etc/passwd', type: 'filename' },
    { input: '$(whoami)', type: 'text' }
  ];

  testCases.forEach((testCase, index) => {
    console.log(`\n${index + 1}. Testing ${testCase.type}: "${testCase.input}"`);
    const result = sanitizer.sanitize(testCase.input, testCase.type);
    console.log(`   Result: "${result.value}"`);
    console.log(`   Valid: ${result.isValid}`);
    console.log(`   Threats: ${result.threats.join(', ') || 'None'}`);
    console.log(`   Sanitized: ${result.sanitized}`);
  });

  console.log('\n✅ Security test suite completed');
}