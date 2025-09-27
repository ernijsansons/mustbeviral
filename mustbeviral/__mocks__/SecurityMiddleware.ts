// Mock SecurityMiddleware for testing
export class SecurityMiddleware {
  constructor() {}

  async validateRequest(request: any): Promise<boolean> {
    return true;
  }

  generateCSRFToken(): string {
    return require('crypto').randomBytes(32).toString('hex');
  }

  validateCSRFToken(token: string, sessionToken: string): boolean {
    return token === sessionToken && token.length > 0;
  }

  applySecurityHeaders(response: any): void {
    // Mock implementation
  }
}

export default SecurityMiddleware;