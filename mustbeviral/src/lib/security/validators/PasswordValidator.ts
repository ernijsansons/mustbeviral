// Simple password validation - easy to understand!
export interface PasswordValidationResult {
  isValid: boolean;
  score: number;
  errors: string[];
  suggestions: string[];
}

export class PasswordValidator {
  private readonly minLength = 8;
  private readonly maxLength = 128;
  private readonly patterns = {
    uppercase: /[A-Z]/,
    lowercase: /[a-z]/,
    digit: /\d/,
    special: /[!@#$%^&*(),.?":{}|<>]/
  };
  private readonly commonPatterns = ['123456', 'password', 'qwerty', 'abc123', '111111'];

  validate(password: string): PasswordValidationResult {
    const validationErrors: string[] = [];
    const validationSuggestions: string[] = [];
    let passwordScore = 0;

    if (!password || typeof password !== 'string') {
      return {
        isValid: false,
        score: 0,
        errors: ['Password is required'],
        suggestions: []
      };
    }

    // Check length
    if (password.length < this.minLength) {
      validationErrors.push(`Password must be at least ${this.minLength} characters`);
    } else if (password.length > this.maxLength) {
      validationErrors.push(`Password must not exceed ${this.maxLength} characters`);
    } else {
      passwordScore += Math.min(password.length / 4, 5);
    }

    // Check uppercase
    if (this.patterns.uppercase.test(password)) {
      passwordScore += 2;
    } else {
      validationErrors.push('Password must contain at least one uppercase letter');
      validationSuggestions.push('Add uppercase letters (A-Z)');
    }

    // Check lowercase
    if (this.patterns.lowercase.test(password)) {
      passwordScore += 2;
    } else {
      validationErrors.push('Password must contain at least one lowercase letter');
      validationSuggestions.push('Add lowercase letters (a-z)');
    }

    // Check digits
    if (this.patterns.digit.test(password)) {
      passwordScore += 2;
    } else {
      validationErrors.push('Password must contain at least one number');
      validationSuggestions.push('Add numbers (0-9)');
    }

    // Check special characters
    if (this.patterns.special.test(password)) {
      passwordScore += 3;
      validationSuggestions.push('Great! Special characters improve security');
    } else {
      validationSuggestions.push('Consider adding special characters (!@#$%^&*)');
    }

    // Check common patterns
    if (this.hasCommonPattern(password)) {
      passwordScore = Math.max(0, passwordScore - 5);
      validationErrors.push('Password contains common patterns');
      validationSuggestions.push('Avoid common passwords and patterns');
    }

    // Check repeated characters
    if (this.hasRepeatedCharacters(password)) {
      passwordScore = Math.max(0, passwordScore - 2);
      validationSuggestions.push('Avoid repeated characters');
    }

    return {
      isValid: validationErrors.length === 0 && passwordScore >= 8,
      score: Math.min(10, passwordScore),
      errors: validationErrors,
      suggestions: validationSuggestions
    };
  }

  isValid(password: string): boolean {
    return this.validate(password).isValid;
  }

  private hasCommonPattern(password: string): boolean {
    return this.commonPatterns.some(pattern =>
      password.toLowerCase().includes(pattern)
    );
  }

  private hasRepeatedCharacters(password: string): boolean {
    return /(.)\1{2,}/.test(password);
  }
}