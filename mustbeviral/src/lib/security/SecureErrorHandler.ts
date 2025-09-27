// Secure Error Handler - Prevents information leakage in production
export interface SecureError {
  message: string;
  code: string;
  timestamp: string;
  requestId?: string;
}

export class SecureErrorHandler {
  private isDevelopment: boolean;

  constructor(environment = 'production') {
    this.isDevelopment = environment === 'development';
  }

  // Sanitize errors for client consumption
  sanitizeError(error: Error | unknown, requestId?: string): SecureError {
    const timestamp = new Date().toISOString();

    if (this.isDevelopment) {
      // In development, provide detailed error information
      return {
        message: error instanceof Error ? error.message : 'Unknown error',
        code: 'INTERNAL_ERROR',
        timestamp,
        requestId,
        ...(error instanceof Error && { stack: error.stack })
      } as SecureError;
    }

    // In production, provide minimal error information
    const secureErrors: Record<string, string> = {
      'ValidationError': 'Invalid input provided',
      'AuthenticationError': 'Authentication required',
      'AuthorizationError': 'Access denied',
      'NotFoundError': 'Resource not found',
      'RateLimitError': 'Too many requests',
      'ServiceUnavailableError': 'Service temporarily unavailable'
    };

    const errorName = error instanceof Error ? error.constructor.name : 'UnknownError';
    const message = secureErrors[errorName] || 'An unexpected error occurred';

    return {
      message,
      code: errorName.replace('Error', '').toUpperCase(),
      timestamp,
      requestId
    };
  }

  // Log error securely (without sensitive data)
  logError(error: Error | unknown, context?: Record<string, any>): void {
    const logData = {
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: this.isDevelopment ? error.stack : undefined
      } : { message: 'Unknown error', error },
      context: this.sanitizeContext(context)
    };

    console.error('[SecureErrorHandler]', JSON.stringify(logData));
  }

  private sanitizeContext(context?: Record<string, any>): Record<string, any> | undefined {
    if (!context) return undefined;

    const sensitiveKeys = ['password', 'token', 'secret', 'key', 'authorization'];
    const sanitized: Record<string, any> = {};

    for (const [key, value] of Object.entries(context)) {
      if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }
}