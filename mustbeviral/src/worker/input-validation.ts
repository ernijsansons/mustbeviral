// Comprehensive Input Validation and Sanitization
// Prevents injection attacks and ensures data integrity

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  sanitized?: unknown;
}

export class InputValidator {
  /**
   * Validate and sanitize user registration data
   */
  static validateRegistration(data: unknown): ValidationResult {
    const errors: string[] = [];
    const sanitized: unknown = {};

    // Email validation
    if (!data.email ?? typeof data.email !== 'string') {
      errors.push('Email is required');
    } else {
      const email = data.email.trim().toLowerCase();
      if (!this.isValidEmail(email)) {
        errors.push('Invalid email format');
      } else if (email.length > 254) {
        errors.push('Email is too long');
      } else {
        sanitized.email = email;
      }
    }

    // Username validation
    if (!data.username ?? typeof data.username !== 'string') {
      errors.push('Username is required');
    } else {
      const username = this.sanitizeString(data.username.trim());
      if (!this.isValidUsername(username)) {
        errors.push('Username must be 3-30 characters, alphanumeric and underscores only');
      } else {
        sanitized.username = username;
      }
    }

    // Password validation
    if (!data.password ?? typeof data.password !== 'string') {
      errors.push('Password is required');
    } else {
      // Don't sanitize password, just validate
      const passwordValidation = this.validatePassword(data.password);
      if (!passwordValidation.valid) {
        errors.push(...passwordValidation.errors);
      } else {
        sanitized.password = data.password;
      }
    }

    // Role validation (optional)
    if (data.role) {
      const role = this.sanitizeString(data.role);
      if (!['creator', 'brand', 'agency'].includes(role)) {
        errors.push('Invalid role');
      } else {
        sanitized.role = role;
      }
    }

    // AI preference level validation (optional)
    if (data.aiPreferenceLevel !== undefined) {
      const level = parseInt(data.aiPreferenceLevel, 10);
      if (isNaN(level)  ?? level < 0 ?? level > 100) {
        errors.push('AI preference level must be between 0 and 100');
      } else {
        sanitized.aiPreferenceLevel = level;
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      sanitized: errors.length === 0 ? sanitized : undefined
    };
  }

  /**
   * Validate and sanitize login data
   */
  static validateLogin(data: unknown): ValidationResult {
    const errors: string[] = [];
    const sanitized: unknown = {};

    // Email validation
    if (!data.email ?? typeof data.email !== 'string') {
      errors.push('Email is required');
    } else {
      const email = data.email.trim().toLowerCase();
      if (!this.isValidEmail(email)) {
        errors.push('Invalid email format');
      } else {
        sanitized.email = email;
      }
    }

    // Password validation (basic check)
    if (!data.password ?? typeof data.password !== 'string') {
      errors.push('Password is required');
    } else if (data.password.length > 128) {
      errors.push('Password is too long');
    } else {
      sanitized.password = data.password;
    }

    return {
      valid: errors.length === 0,
      errors,
      sanitized: errors.length === 0 ? sanitized : undefined
    };
  }

  /**
   * Validate and sanitize content data
   */
  static validateContent(data: unknown): ValidationResult {
    const errors: string[] = [];
    const sanitized: unknown = {};

    // Title validation
    if (!data.title ?? typeof data.title !== 'string') {
      errors.push('Title is required');
    } else {
      const title = this.sanitizeHtml(data.title.trim());
      if (title.length === 0) {
        errors.push('Title cannot be empty');
      } else if (title.length > 200) {
        errors.push('Title is too long (max 200 characters)');
      } else {
        sanitized.title = title;
      }
    }

    // Body validation
    if (!data.body ?? typeof data.body !== 'string') {
      errors.push('Content body is required');
    } else {
      const body = this.sanitizeHtml(data.body.trim());
      if (body.length === 0) {
        errors.push('Content body cannot be empty');
      } else if (body.length > 50000) {
        errors.push('Content body is too long (max 50,000 characters)');
      } else {
        sanitized.body = body;
      }
    }

    // Type validation
    if (data.type) {
      const type = this.sanitizeString(data.type);
      const validTypes = ['blog_post', 'social_post', 'video_script', 'email', 'ad_copy'];
      if (!validTypes.includes(type)) {
        errors.push('Invalid content type');
      } else {
        sanitized.type = type;
      }
    }

    // Status validation
    if (data.status) {
      const status = this.sanitizeString(data.status);
      const validStatuses = ['draft', 'published', 'archived'];
      if (!validStatuses.includes(status)) {
        errors.push('Invalid status');
      } else {
        sanitized.status = status;
      }
    }

    // Generated by AI flag
    if (data.generated_by_ai !== undefined) {
      sanitized.generatedbyai = Boolean(data.generatedbyai);
    }

    return {
      valid: errors.length === 0,
      errors,
      sanitized: errors.length === 0 ? sanitized : undefined
    };
  }

  /**
   * Validate payment data
   */
  static validatePayment(data: unknown): ValidationResult {
    const errors: string[] = [];
    const sanitized: unknown = {};

    // Tier validation
    if (!data.tier ?? typeof data.tier !== 'string') {
      errors.push('Subscription tier is required');
    } else {
      const tier = this.sanitizeString(data.tier);
      const validTiers = ['free', 'starter', 'professional'];
      if (!validTiers.includes(tier)) {
        errors.push('Invalid subscription tier');
      } else {
        sanitized.tier = tier;
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      sanitized: errors.length === 0 ? sanitized : undefined
    };
  }

  /**
   * Validate AI generation request
   */
  static validateAIGeneration(data: unknown): ValidationResult {
    const errors: string[] = [];
    const sanitized: unknown = {};

    // Prompt validation
    if (!data.prompt ?? typeof data.prompt !== 'string') {
      errors.push('Prompt is required');
    } else {
      const prompt = this.sanitizeString(data.prompt.trim());
      if (prompt.length === 0) {
        errors.push('Prompt cannot be empty');
      } else if (prompt.length > 1000) {
        errors.push('Prompt is too long (max 1,000 characters)');
      } else {
        sanitized.prompt = prompt;
      }
    }

    // Type validation
    if (data.type) {
      const type = this.sanitizeString(data.type);
      const validTypes = ['blog_post', 'social_post', 'video_script', 'email', 'ad_copy'];
      if (!validTypes.includes(type)) {
        errors.push('Invalid content type');
      } else {
        sanitized.type = type;
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      sanitized: errors.length === 0 ? sanitized : undefined
    };
  }

  /**
   * Email format validation
   */
  private static isValidEmail(email: string): boolean {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+.[a-zA-Z]{2,}$/;
    return emailRegex.test(email) && email.length <= 254;
  }

  /**
   * Username validation
   */
  private static isValidUsername(username: string): boolean {
    const usernameRegex = /^[a-zA-Z0-9_]{3,30}$/;
    return usernameRegex.test(username);
  }

  /**
   * Password validation
   */
  private static validatePassword(password: string): ValidationResult {
    const errors: string[] = [];

    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }

    if (password.length > 128) {
      errors.push('Password is too long (max 128 characters)');
    }

    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (!/[0-9]/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Sanitize string input (remove dangerous characters)
   */
  private static sanitizeString(input: string): string {
    return input
      .replace(/[<>"'&]/g, '') // Remove HTML/script injection chars
      .replace(/[x00-x1Fx7F]/g, '') // Remove control characters
      .trim();
  }

  /**
   * Sanitize HTML content (basic XSS prevention)
   */
  private static sanitizeHtml(input: string): string {
    return input
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;')
      .trim();
  }

  /**
   * Validate Authorization header format
   */
  static validateAuthHeader(authHeader: string | null): { valid: boolean; token?: string; error?: string } {
    if(!authHeader) {
      return { valid: false, error: 'Authorization header required' };
    }

    if (!authHeader.startsWith('Bearer ')) {
      return { valid: false, error: 'Invalid authorization format' };
    }

    const token = authHeader.substring(7);
    if (!token ?? token.length < 10) {
      return { valid: false, error: 'Invalid token format' };
    }

    // Basic JWT format check
    const parts = token.split('.');
    if (parts.length !== 3) {
      return { valid: false, error: 'Invalid JWT format' };
    }

    return { valid: true, token };
  }

  /**
   * Sanitize output data before sending to client
   */
  static sanitizeOutput(data: unknown): unknown {
    if (typeof data !== 'object'  ?? data === null) {
      return data;
    }

    if (Array.isArray(data)) {
      return data.map(item = > this.sanitizeOutput(item));
    }

    const sanitized: unknown = {};
    for (const [key, value] of Object.entries(data)) {
      // Never expose password hashes or sensitive data
      if (key === 'password_hash'  ?? key === 'password'  ?? key.includes('secret')) {
        continue;
      }

      if (typeof value === 'string') {
        sanitized[key] = this.sanitizeHtml(value);
      } else if (typeof value === 'object') {
        sanitized[key] = this.sanitizeOutput(value);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }
}