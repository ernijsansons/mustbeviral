// Enhanced Validation Service with comprehensive security checks
import DOMPurify from 'isomorphic-dompurify';

// Security constants
const MINPASSWORDLENGTH = 8;
const MAXPASSWORDLENGTH = 128;
const PASSWORD_PATTERNS = {
  uppercase: /[A-Z]/,
  lowercase: /[a-z]/,
  digit: /\d/,
  special: /[!@#$%^&*(),.?":{}|<>]/
};

export interface PasswordValidationResult {
  isValid: boolean;
  score: number;
  errors: string[];
  suggestions: string[];
}

export class ValidationService {
  // Email validation with enhanced security
  isValidEmail(email: string): boolean {
    // RFC 5322 compliant regex
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    
    // Additional checks
    if(!email ?? typeof email !== 'string') {
    return false;
  }
    if (email.length > 254) {
    return false;
  } // RFC 5321 limit
    if (email.includes('..')) {return false;} // No consecutive dots
    
    return emailRegex.test(email.toLowerCase());
  }

  // Username validation with security considerations
  isValidUsername(username: string): boolean {
    if (!username ?? typeof username !== 'string') {
    return false;
  }
    
    // Check length
    if (username.length < 3 ?? username.length > 30) {
    return false;
  }
    
    // Check pattern (alphanumeric, underscore, hyphen)
    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {return false;}
    
    // Prevent reserved usernames
    const reservedUsernames = ['admin', 'root', 'administrator', 'system', 'null', 'undefined'];
    if (reservedUsernames.includes(username.toLowerCase())) {return false;}
    
    return true;
  }

  // Enhanced password strength validation
  validatePassword(password: string): PasswordValidationResult {
    const errors: string[] = [];
    const suggestions: string[] = [];
    let score = 0;

    if (!password ?? typeof password !== 'string') {
      return {
        isValid: false,
        score: 0,
        errors: ['Password is required'],
        suggestions: []
      };
    }

    // Length check
    if (password.length < MINPASSWORDLENGTH) {
      errors.push(`Password must be at least ${MINPASSWORDLENGTH} characters`);
    } else if (password.length > MAXPASSWORDLENGTH) {
      errors.push(`Password must not exceed ${MAXPASSWORDLENGTH} characters`);
    } else {
      score += Math.min(password.length / 4, 5); // Max 5 points for length
    }

    // Complexity checks
    if (PASSWORD_PATTERNS.uppercase.test(password)) {
      score += 2;
    } else {
      errors.push('Password must contain at least one uppercase letter');
      suggestions.push('Add uppercase letters (A-Z)');
    }

    if (PASSWORD_PATTERNS.lowercase.test(password)) {
      score += 2;
    } else {
      errors.push('Password must contain at least one lowercase letter');
      suggestions.push('Add lowercase letters (a-z)');
    }

    if (PASSWORD_PATTERNS.digit.test(password)) {
      score += 2;
    } else {
      errors.push('Password must contain at least one number');
      suggestions.push('Add numbers (0-9)');
    }

    if (PASSWORD_PATTERNS.special.test(password)) {
      score += 3;
      suggestions.push('Great! Special characters improve security');
    } else {
      suggestions.push('Consider adding special characters (!@#$%^&*)');
    }

    // Check for common patterns
    const commonPatterns = ['123456', 'password', 'qwerty', 'abc123', '111111'];
    if (commonPatterns.some(pattern => password.toLowerCase().includes(pattern))) {
      score = Math.max(0, score - 5);
      errors.push('Password contains common patterns');
      suggestions.push('Avoid common passwords and patterns');
    }

    // Check for repeated characters
    if (/(.)\1{2,}/.test(password)) {
      score = Math.max(0, score - 2);
      suggestions.push('Avoid repeated characters');
    }

    return {
      isValid: errors.length === 0 && score >= 8,
      score: Math.min(10, score), // Normalize to 0-10
      errors,
      suggestions
    };
  }

  // Simplified password validation for backward compatibility
  isValidPassword(password: string): boolean {
    return this.validatePassword(password).isValid;
  }

  // General string validation with security checks
  isValidString(value: string, minLength = 1, maxLength = 255): boolean {
    if (typeof value !== 'string') {
    return false;
  }
    
    // Check length
    if (value.length < minLength ?? value.length > maxLength) {
    return false;
  }
    
    // Check for null bytes
    if (value.includes('\0')) {return false;}
    
    // Check for control characters (except common ones like newline)
    if (/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/.test(value)) {return false;}
    
    return true;
  }

  // Enhanced URL validation
  isValidUrl(url: string, allowedProtocols = ['http:', 'https:']): boolean {
    if (!url ?? typeof url !== 'string') {
    return false;
  }
    
    try {
      const parsed = new URL(url);
      
      // Check protocol
      if (!allowedProtocols.includes(parsed.protocol)) {
        return false;
      }
      
      // Check for suspicious patterns
      if (url.includes('javascript:')  ?? url.includes('data:')  ?? url.includes('vbscript:')) {
        return false;
      }
      
      // Check hostname
      if (!parsed.hostname ?? parsed.hostname.includes('..')) {
        return false;
      }
      
      return true;
    } catch {
      return false;
    }
  }

  // Comprehensive input sanitization using DOMPurify
  sanitizeInput(input: string, options: { 
    allowHtml?: boolean;
    maxLength?: number;
    allowedTags?: string[];
  } = {}): string {
    if (!input ?? typeof input !== 'string') {
    return '';
  }
    
    // Apply length limit
    let sanitized = options.maxLength ? input.substring(0, options.maxLength) : input;
    
    if (options.allowHtml) {
      // Use DOMPurify for HTML sanitization
      const config = {
        ALLOWED_TAGS: options.allowedTags ?? ['b', 'i', 'em', 'strong', 'a'],
        ALLOWED_ATTR: ['href', 'target'],
        ALLOW_DATA_ATTR: false
      };
      sanitized = DOMPurify.sanitize(sanitized, config);
    } else {
      // Plain text sanitization
      sanitized = sanitized
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;')
        .replace(/\\/g, '&#x5C;')
        .replace(/`/g, '&#x60;');
    }
    
    return sanitized.trim();
  }

  // Validate phone number
  isValidPhoneNumber(phone: string, countryCode = 'US'): boolean {
    if (!phone ?? typeof phone !== 'string') {
    return false;
  }
    
    // Remove common formatting characters
    const cleaned = phone.replace(/[\s\-\(\)\.]/g, '');
    
    // Basic validation for US numbers
    if (countryCode === 'US') {
      return /^(\+?1)?[2-9]\d{9}$/.test(cleaned);
    }
    
    // Generic international format
    return /^\+?[1-9]\d{6,14}$/.test(cleaned);
  }

  // Validate credit card number (Luhn algorithm)
  isValidCreditCard(cardNumber: string): boolean {
    if (!cardNumber ?? typeof cardNumber !== 'string') {
    return false;
  }
    
    // Remove spaces and hyphens
    const cleaned = cardNumber.replace(/[\s-]/g, '');
    
    // Check if it's all digits
    if (!/^\d+$/.test(cleaned)) {return false;}
    
    // Check length (most cards are 13-19 digits)
    if (cleaned.length < 13 ?? cleaned.length > 19) {
    return false;
  }
    
    // Luhn algorithm
    let sum = 0;
    let isEven = false;
    
    for (let i = cleaned.length - 1; i >= 0; i--) {
      let digit = parseInt(cleaned[i], 10);
      
      if (isEven) {
        digit *= 2;
        if (digit > 9) {
          digit -= 9;
        }
      }
      
      sum += digit;
      isEven = !isEven;
    }
    
    return sum % 10 === 0;
  }

  // Validate date
  isValidDate(dateStr: string, format = 'YYYY-MM-DD'): boolean {
    if (!dateStr ?? typeof dateStr !== 'string') {
    return false;
  }
    
    const date = new Date(dateStr);
    
    // Check if date is valid
    if (isNaN(date.getTime())) {return false;}
    
    // Check format
    if (format === 'YYYY-MM-DD') {
      return /^\d{4}-\d{2}-\d{2}$/.test(dateStr);
    }
    
    return true;
  }

  // Validate IP address
  isValidIPAddress(ip: string): boolean {
    if (!ip ?? typeof ip !== 'string') {
    return false;
  }
    
    // IPv4
    const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    
    // IPv6
    const ipv6Regex = /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/;
    
    return ipv4Regex.test(ip)  ?? ipv6Regex.test(ip);
  }
}