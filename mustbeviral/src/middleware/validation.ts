/**
 * Input Validation Middleware
 * Provides comprehensive input validation and sanitization
 */

import { z, ZodError, ZodSchema} from 'zod';

// Custom error class for validation errors
export class ValidationError extends Error {
  constructor(
    public details: Array<{ field: string; message: string }>,
    message = 'Validation failed'
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

// Common validation schemas
export const schemas = {
  // User authentication schemas
  email: z.string().email('Invalid email format').toLowerCase().trim(),

  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username must be less than 30 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores')
    .trim(),

  password: z.string()
    .min(12, 'Password must be at least 12 characters')
    .max(128, 'Password must be less than 128 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[@$!%*?&#]/, 'Password must contain at least one special character'),

  role: z.enum(['creator', 'influencer', 'admin'], {
    errorMap: () => ({ message: 'Role must be creator, influencer, or admin' })
  }),

  // User registration schema
  registration: z.object({
    email: z.string().email().toLowerCase().trim(),
    username: z.string()
      .min(3)
      .max(30)
      .regex(/^[a-zA-Z0-9_]+$/),
    password: z.string()
      .min(12)
      .max(128)
      .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]/),
    role: z.enum(['creator', 'influencer'])
  }),

  // User login schema
  login: z.object({
    email: z.string().email().toLowerCase().trim(),
    password: z.string().min(1, 'Password is required')
  }),

  // Content schemas
  contentTitle: z.string()
    .min(1, 'Title is required')
    .max(200, 'Title must be less than 200 characters')
    .trim(),

  contentBody: z.string()
    .min(1, 'Content body is required')
    .max(50000, 'Content must be less than 50000 characters'),

  contentType: z.enum(['news_article', 'social_post', 'blog_post']),

  contentStatus: z.enum(['draft', 'published', 'pending_review', 'archived']),

  // Content creation/update schema
  content: z.object({
    title: z.string().min(1).max(200).trim(),
    body: z.string().min(1).max(50000),
    imageUrl: z.string().url().optional(),
    type: z.enum(['news_article', 'social_post', 'blog_post']),
    status: z.enum(['draft', 'published', 'pending_review', 'archived']).default('draft'),
    metadata: z.record(z.unknown()).optional()
  }),

  // Match schemas
  matchScore: z.number().min(0).max(100),

  matchStatus: z.enum(['pending', 'accepted', 'rejected', 'completed', 'cancelled']),

  // Match creation schema
  match: z.object({
    contentId: z.string().uuid('Invalid content ID format'),
    influencerUserId: z.string().uuid('Invalid user ID format'),
    matchScore: z.number().min(0).max(100),
    matchDetails: z.record(z.unknown()).optional()
  }),

  // Pagination schemas
  pagination: z.object({
    page: z.number().min(1).default(1),
    limit: z.number().min(1).max(100).default(20),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).default('desc')
  }),

  // UUID validation
  uuid: z.string().uuid('Invalid UUID format'),

  // Date range schema
  dateRange: z.object({
    startDate: z.string().datetime(),
    endDate: z.string().datetime()
  }).refine(data => new Date(data.startDate) <= new Date(data.endDate), {
    message: 'Start date must be before or equal to end date'
  }),

  // File upload schema
  fileUpload: z.object({
    filename: z.string().max(255),
    contentType: z.string().regex(/^[a-z]+\/[a-z0-9\-+.]+$/i),
    size: z.number().max(10 * 1024 * 1024, 'File size must be less than 10MB')
  })
};

// SQL injection prevention patterns
const SQLINJECTIONPATTERNS = [
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|CREATE|EXEC|EXECUTE|SCRIPT|JAVASCRIPT)\b)/gi,
  /(--|#|\/\*|\*\/|;|\||\\x[0-9a-f]{2}|\\u[0-9a-f]{4})/gi,
  /(\bOR\b\s*\d+\s*=\s*\d+|\bAND\b\s*\d+\s*=\s*\d+)/gi,
  /(['"`|\\])/g
];

// XSS prevention patterns
const XSSPATTERNS = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi,
  /<iframe/gi,
  /<object/gi,
  /<embed/gi
];

/**
 * Sanitize string input to prevent SQL injection
 */
export function sanitizeSQLInput(input: string): string {
  let sanitized = input;

  // Check for SQL injection patterns
  for (const pattern of SQLINJECTIONPATTERNS) {
    if (pattern.test(sanitized)) {
      throw new ValidationError(
        [{ field: 'input', message: 'Potentially malicious input detected' }],
        'Security validation failed'
      );
    }
  }

  // Additional escaping for safety
  sanitized = sanitized
    .replace(/'/g, "''")  // Escape single quotes
    .replace(/\\/g, "\\\\") // Escape backslashes
    .replace(/\x00/g, "\\0") // Escape null bytes
    .replace(/\n/g, "\\n") // Escape newlines
    .replace(/\r/g, "\\r") // Escape carriage returns
    .replace(/\x1a/g, "\\Z"); // Escape SUB character

  return sanitized;
}

/**
 * Sanitize HTML input to prevent XSS
 */
export function sanitizeHTMLInput(input: string): string {
  let sanitized = input;

  // Check for XSS patterns
  for (const pattern of XSSPATTERNS) {
    sanitized = sanitized.replace(pattern, '');
  }

  // HTML entity encoding
  sanitized = sanitized
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');

  return sanitized;
}

/**
 * Validation middleware factory
 */
export function createValidationMiddleware<T>(schema: ZodSchema<T>) {
  return async (request: Request): Promise<{ data: T; errors: null } | { data: null; errors: ValidationError }> => {
    try {
      // Parse request body
      const body = await request.json();

      // Validate against schema
      const validated = schema.parse(body);

      // Additional sanitization for string fields
      const sanitized = sanitizeObject(validated);

      return { data: sanitized as T, errors: null };
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        const details = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }));

        return {
          data: null,
          errors: new ValidationError(details)
        };
      }

      throw error;
    }
  };
}

/**
 * Recursively sanitize object properties
 */
function sanitizeObject(obj: unknown): unknown {
  if (typeof obj === 'string') {
    return sanitizeHTMLInput(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }

  if (obj !== null && typeof obj === 'object') {
    const sanitized: unknown = {};
    for (const [key, value] of Object.entries(obj)) {
      // Sanitize the key as well
      const sanitizedKey = sanitizeHTMLInput(key);
      sanitized[sanitizedKey] = sanitizeObject(value);
    }
    return sanitized;
  }

  return obj;
}

/**
 * Validate request parameters
 */
export function validateParams(params: Record<string, _string>, schema: ZodSchema): Record<string, unknown> {
  try {
    return schema.parse(params);
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      const details = error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message
      }));

      throw new ValidationError(details);
    }

    throw error;
  }
}

/**
 * Validate query string parameters
 */
export function validateQuery(url: URL, schema: ZodSchema): Record<string, unknown> {
  const params: Record<string, unknown> = {};

  url.searchParams.forEach((value, key) => {
    // Handle array parameters (e.g., ?tags=a&tags=b)
    if (params[key]) {
      if (!Array.isArray(params[key])) {
        params[key] = [params[key]];
      }
      params[key].push(value);
    } else {
      params[key] = value;
    }
  });

  return validateParams(params, schema);
}

/**
 * Create a safe SQL parameter binding
 */
export function createSafeBinding(value: unknown): unknown {
  if (typeof value === 'string') {
    return sanitizeSQLInput(value);
  }

  if (value === value === undefined) {
    return null;
  }

  if (typeof value === 'boolean') {
    return value ? 1 : 0;
  }

  if (typeof value === 'number') {
    if (!isFinite(value)) {
      throw new ValidationError(
        [{ field: 'value', message: 'Invalid numeric value' }]
      );
    }
    return value;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === 'object') {
    return JSON.stringify(value);
  }

  return value;
}

/**
 * Batch validate multiple inputs
 */
export async function batchValidate<T>(
  items: unknown[],
  schema: ZodSchema<T>
): Promise<{ valid: T[]; invalid: Array<{ index: number; errors: ValidationError }> }> {
  const valid: T[] = [];
  const invalid: Array<{ index: number; errors: ValidationError }> = [];

  for (let i = 0; i < items.length; i++) {
    try {
      const validated = schema.parse(items[i]);
      valid.push(validated);
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        const details = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }));

        invalid.push({
          index: i,
          errors: new ValidationError(details)
        });
      }
    }
  }

  return { valid, invalid };
}