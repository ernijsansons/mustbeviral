// Simple token validation - no magic!
export class TokenValidator {
  isValidJWT(jwtToken: string): boolean {
    if (!jwtToken || typeof jwtToken !== 'string') {
      return false;
    }

    const tokenParts = jwtToken.split('.');
    if (tokenParts.length !== 3) {
      return false;
    }

    try {
      // Check if each part is valid base64
      for (const part of tokenParts) {
        this.decodeBase64Url(part);
      }
      return true;
    } catch {
      return false;
    }
  }

  isValidAPIKey(apiKey: string): boolean {
    if (!apiKey || typeof apiKey !== 'string') {
      return false;
    }

    // API key should be 32-64 characters
    if (apiKey.length < 32 || apiKey.length > 64) {
      return false;
    }

    // Should only contain alphanumeric characters and specific symbols
    return /^[A-Za-z0-9_-]+$/.test(apiKey);
  }

  isValidSessionToken(sessionToken: string): boolean {
    if (!sessionToken || typeof sessionToken !== 'string') {
      return false;
    }

    // Session token should be 16-128 characters
    if (sessionToken.length < 16 || sessionToken.length > 128) {
      return false;
    }

    // Should be hexadecimal
    return /^[a-fA-F0-9]+$/.test(sessionToken);
  }

  isValidCSRFToken(csrfToken: string): boolean {
    if (!csrfToken || typeof csrfToken !== 'string') {
      return false;
    }

    // CSRF token should be 32-64 characters
    if (csrfToken.length < 32 || csrfToken.length > 64) {
      return false;
    }

    // Should be base64url encoded
    return /^[A-Za-z0-9_-]+$/.test(csrfToken);
  }

  extractJWTPayload(jwtToken: string): Record<string, unknown> | null {
    if (!this.isValidJWT(jwtToken)) {
      return null;
    }

    try {
      const tokenParts = jwtToken.split('.');
      const payloadPart = tokenParts[1];
      const decodedPayload = this.decodeBase64Url(payloadPart);
      return JSON.parse(decodedPayload);
    } catch {
      return null;
    }
  }

  isTokenExpired(jwtToken: string): boolean {
    const tokenPayload = this.extractJWTPayload(jwtToken);
    if (!tokenPayload || !tokenPayload.exp) {
      return true;
    }

    const currentTime = Math.floor(Date.now() / 1000);
    return currentTime >= (tokenPayload.exp as number);
  }

  private decodeBase64Url(base64UrlString: string): string {
    // Add padding if needed
    let paddedString = base64UrlString;
    while (paddedString.length % 4) {
      paddedString += '=';
    }

    // Replace URL-safe characters
    const base64String = paddedString
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    return atob(base64String);
  }
}