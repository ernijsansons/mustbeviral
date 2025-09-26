// Error classes for Must Be Viral

export interface ValidationErrorField {
  field: string;
  message: string;
}

// Base error class with common functionality
export abstract class AppError extends Error {
  public statusCode: number;
  public abstract readonly name: string;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    Error.captureStackTrace?.(this, this.constructor);
  }

  toJSON(): Record<string, any> {
    return {
      name: this.name,
      message: this.message,
      statusCode: this.statusCode
    };
  }
}

export class ValidationError extends AppError {
  public readonly name = 'ValidationError';
  public fields: ValidationErrorField[];

  constructor(fields: ValidationErrorField[], message = 'Validation failed', statusCode = 400) {
    super(message, statusCode);
    this.fields = fields;
  }

  toJSON(): Record<string, any> {
    return {
      ...super.toJSON(),
      fields: this.fields
    };
  }
}

export class AuthenticationError extends AppError {
  public readonly name = 'AuthenticationError';

  constructor(message = 'Authentication failed', statusCode = 401) {
    super(message, statusCode);
  }
}

export class AuthorizationError extends AppError {
  public readonly name = 'AuthorizationError';

  constructor(message = 'Authorization failed', statusCode = 403) {
    super(message, statusCode);
  }
}

export class NotFoundError extends AppError {
  public readonly name = 'NotFoundError';

  constructor(message = 'Resource not found', statusCode = 404) {
    super(message, statusCode);
  }
}

export class ConflictError extends AppError {
  public readonly name = 'ConflictError';

  constructor(message = 'Resource conflict', statusCode = 409) {
    super(message, statusCode);
  }
}

export class InternalServerError extends AppError {
  public readonly name = 'InternalServerError';

  constructor(message = 'Internal server error', statusCode = 500) {
    super(message, statusCode);
  }
}

// Additional utility functions for error handling
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

export function createErrorResponse(error: AppError): {
  error: Record<string, any>;
  status: number;
} {
  return {
    error: error.toJSON(),
    status: error.statusCode
  };
}