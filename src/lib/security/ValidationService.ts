// Simple Validation Service
export class ValidationService {
  // Email validation
  isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Username validation
  isValidUsername(username: string): boolean {
    return /^[a-zA-Z0-9_-]{3,30}$/.test(username);
  }

  // Password strength validation
  isValidPassword(password: string): boolean {
    return password.length >= 8;
  }

  // General string validation
  isValidString(value: string, minLength = 1, maxLength = 255): boolean {
    return typeof value === 'string' &&
           value.length >= minLength &&
           value.length <= maxLength;
  }

  // URL validation
  isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  // Sanitize input to prevent XSS
  sanitizeInput(input: string): string {
    return input
      .replace(/[<>]/g, '')
      .replace(/javascript:/gi, '')
      .trim();
  }
}