import DOMPurify from 'isomorphic-dompurify';

// Simple input validation - no complex logic!
export interface SanitizeOptions {
  allowHtml?: boolean;
  maxLength?: number;
  allowedTags?: string[];
}

export class InputValidator {
  isValidString(inputValue: string, minLength = 1, maxLength = 255): boolean {
    if (typeof inputValue !== 'string') {
      return false;
    }

    if (inputValue.length < minLength || inputValue.length > maxLength) {
      return false;
    }

    if (inputValue.includes('\0')) {
      return false;
    }

    if (this.hasControlCharacters(inputValue)) {
      return false;
    }

    return true;
  }

  isValidUsername(username: string): boolean {
    if (!username || typeof username !== 'string') {
      return false;
    }

    if (username.length < 3 || username.length > 30) {
      return false;
    }

    if (!this.hasValidUsernamePattern(username)) {
      return false;
    }

    if (this.isReservedUsername(username)) {
      return false;
    }

    return true;
  }

  sanitizeInput(userInput: string, options: SanitizeOptions = {}): string {
    if (!userInput || typeof userInput !== 'string') {
      return '';
    }

    let cleanInput = userInput;

    if (options.maxLength) {
      cleanInput = cleanInput.substring(0, options.maxLength);
    }

    if (options.allowHtml) {
      cleanInput = this.sanitizeHtml(cleanInput, options.allowedTags);
    } else {
      cleanInput = this.sanitizeText(cleanInput);
    }

    return cleanInput.trim();
  }

  private hasValidUsernamePattern(username: string): boolean {
    return /^[a-zA-Z0-9_-]+$/.test(username);
  }

  private isReservedUsername(username: string): boolean {
    const reservedNames = ['admin', 'root', 'administrator', 'system', 'null', 'undefined'];
    return reservedNames.includes(username.toLowerCase());
  }

  private hasControlCharacters(inputValue: string): boolean {
    return /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/.test(inputValue);
  }

  private sanitizeHtml(htmlInput: string, allowedTags?: string[]): string {
    const config = {
      ALLOWED_TAGS: allowedTags ?? ['b', 'i', 'em', 'strong', 'a'],
      ALLOWED_ATTR: ['href', 'target'],
      ALLOW_DATA_ATTR: false
    };
    return DOMPurify.sanitize(htmlInput, config);
  }

  private sanitizeText(textInput: string): string {
    return textInput
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;')
      .replace(/\\/g, '&#x5C;')
      .replace(/`/g, '&#x60;');
  }
}