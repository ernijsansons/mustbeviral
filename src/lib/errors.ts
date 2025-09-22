// Error classes for Must Be Viral

export interface ValidationErrorField {
  field: string;
  message: string;
}

export class ValidationError extends Error {
  public fields: ValidationErrorField[];
  public statusCode: number;

  constructor(fields: ValidationErrorField[], message = 'Validation failed', statusCode = 400) {
    super(message);
    this.name = 'ValidationError';
    this.fields = fields;
    this.statusCode = statusCode;
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      fields: this.fields,
      statusCode: this.statusCode
    };
  }
}

export class AuthenticationError extends Error {
  public statusCode: number;

  constructor(message = 'Authentication failed', statusCode = 401) {
    super(message);
    this.name = 'AuthenticationError';
    this.statusCode = statusCode;
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      statusCode: this.statusCode
    };
  }
}

export class AuthorizationError extends Error {
  public statusCode: number;

  constructor(message = 'Authorization failed', statusCode = 403) {
    super(message);
    this.name = 'AuthorizationError';
    this.statusCode = statusCode;
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      statusCode: this.statusCode
    };
  }
}

export class NotFoundError extends Error {
  public statusCode: number;

  constructor(message = 'Resource not found', statusCode = 404) {
    super(message);
    this.name = 'NotFoundError';
    this.statusCode = statusCode;
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      statusCode: this.statusCode
    };
  }
}

export class ConflictError extends Error {
  public statusCode: number;

  constructor(message = 'Resource conflict', statusCode = 409) {
    super(message);
    this.name = 'ConflictError';
    this.statusCode = statusCode;
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      statusCode: this.statusCode
    };
  }
}

export class InternalServerError extends Error {
  public statusCode: number;

  constructor(message = 'Internal server error', statusCode = 500) {
    super(message);
    this.name = 'InternalServerError';
    this.statusCode = statusCode;
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      statusCode: this.statusCode
    };
  }
}