// Simple validation service - delegates to focused validators
import { EmailValidator } from './validators/EmailValidator';
import { PasswordValidator, PasswordValidationResult } from './validators/PasswordValidator';
import { InputValidator, SanitizeOptions } from './validators/InputValidator';
import { FileValidator } from './validators/FileValidator';
import { TokenValidator } from './validators/TokenValidator';

export { PasswordValidationResult } from './validators/PasswordValidator';

export class ValidationService {
  private emailValidator = new EmailValidator();
  private passwordValidator = new PasswordValidator();
  private inputValidator = new InputValidator();
  private fileValidator = new FileValidator();
  private tokenValidator = new TokenValidator();
  // Email validation - delegate to EmailValidator
  isValidEmail(email: string): boolean {
    return this.emailValidator.isValid(email);
  }

  // Username validation - delegate to InputValidator
  isValidUsername(username: string): boolean {
    return this.inputValidator.isValidUsername(username);
  }

  // Password validation - delegate to PasswordValidator
  validatePassword(password: string): PasswordValidationResult {
    return this.passwordValidator.validate(password);
  }

  // Simple password validation - delegate to PasswordValidator
  isValidPassword(password: string): boolean {
    return this.passwordValidator.isValid(password);
  }

  // String validation - delegate to InputValidator
  isValidString(value: string, minLength = 1, maxLength = 255): boolean {
    return this.inputValidator.isValidString(value, minLength, maxLength);
  }

  // URL validation - delegate to FileValidator
  isValidUrl(url: string, allowedProtocols = ['http:', 'https:']): boolean {
    return this.fileValidator.isValidUrl(url, allowedProtocols);
  }

  // Input sanitization - delegate to InputValidator
  sanitizeInput(input: string, options: SanitizeOptions = {}): string {
    return this.inputValidator.sanitizeInput(input, options);
  }

  // Phone validation - delegate to FileValidator
  isValidPhoneNumber(phone: string, countryCode = 'US'): boolean {
    return this.fileValidator.isValidPhoneNumber(phone, countryCode);
  }

  // Credit card validation - delegate to FileValidator
  isValidCreditCard(cardNumber: string): boolean {
    return this.fileValidator.isValidCreditCard(cardNumber);
  }

  // Date validation - delegate to FileValidator
  isValidDate(dateStr: string, format = 'YYYY-MM-DD'): boolean {
    return this.fileValidator.isValidDate(dateStr, format);
  }

  // IP validation - delegate to FileValidator
  isValidIPAddress(ip: string): boolean {
    return this.fileValidator.isValidIPAddress(ip);
  }
}