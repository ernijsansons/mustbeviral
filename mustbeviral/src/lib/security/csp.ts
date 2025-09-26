/**
 * Content Security Policy Configuration
 * Provides enterprise-grade security headers to prevent XSS and other attacks
 */

export interface CSPDirectives {
  'default-src'?: string[];
  'script-src'?: string[];
  'style-src'?: string[];
  'img-src'?: string[];
  'font-src'?: string[];
  'connect-src'?: string[];
  'media-src'?: string[];
  'object-src'?: string[];
  'child-src'?: string[];
  'frame-src'?: string[];
  'worker-src'?: string[];
  'frame-ancestors'?: string[];
  'form-action'?: string[];
  'base-uri'?: string[];
  'upgrade-insecure-requests'?: boolean;
  'block-all-mixed-content'?: boolean;
}

export const getCSPDirectives = (env: 'development' | 'production' = 'production'): CSPDirectives => {
  const isDev = env === 'development';

  return {
    'default-src': ["'self'"],
    'script-src': [
      "'self'",
      ...(isDev ? ["'unsafe-eval'", "'unsafe-inline'"] : []),
      'https://js.stripe.com',
      'https://www.google-analytics.com',
      'https://www.googletagmanager.com',
      'https://connect.facebook.net',
      'https://www.youtube.com',
      'https://player.vimeo.com',
      // Add nonce for inline scripts in production
      ...(isDev ? [] : ["'nonce-{NONCE}'"]),
    ],
    'style-src': [
      "'self'",
      "'unsafe-inline'", // Required for Tailwind CSS
      'https://fonts.googleapis.com',
      'https://cdn.jsdelivr.net',
    ],
    'img-src': [
      "'self'",
      'data:',
      'blob:',
      'https:',
      'https://images.unsplash.com',
      'https://via.placeholder.com',
      'https://i.imgur.com',
      'https://avatars.githubusercontent.com',
      'https://lh3.googleusercontent.com',
      'https://platform-lookaside.fbsbx.com',
    ],
    'font-src': [
      "'self'",
      'https://fonts.gstatic.com',
      'https://fonts.googleapis.com',
      'data:',
    ],
    'connect-src': [
      "'self'",
      'https://api.stripe.com',
      'https://www.google-analytics.com',
      'https://vitals.vercel-analytics.com',
      'https://api.openai.com',
      'https://api.anthropic.com',
      ...(isDev ? ['ws://localhost:*', 'http://localhost:*'] : []),
      // Cloudflare Workers endpoints
      'https://*.workers.dev',
      'https://*.cloudflarestorage.com',
    ],
    'media-src': [
      "'self'",
      'https:',
      'data:',
      'blob:',
    ],
    'object-src': ["'none'"],
    'child-src': [
      "'self'",
      'https://js.stripe.com',
      'https://www.youtube.com',
      'https://player.vimeo.com',
    ],
    'frame-src': [
      "'self'",
      'https://js.stripe.com',
      'https://www.youtube.com',
      'https://player.vimeo.com',
      'https://www.google.com', // reCAPTCHA
    ],
    'worker-src': [
      "'self'",
      'blob:',
    ],
    'frame-ancestors': ["'none'"], // Prevents clickjacking
    'form-action': [
      "'self'",
      'https://api.stripe.com',
    ],
    'base-uri': ["'self'"],
    'upgrade-insecure-requests': !isDev,
    'block-all-mixed-content': !isDev,
  };
};

export const generateCSPHeader = (directives: CSPDirectives, nonce?: string): string => {
  const policies: string[] = [];

  Object.entries(directives).forEach(([directive, value]) => {
    if (typeof value === 'boolean') {
      if (value) {
        policies.push(directive.replace(/([A-Z])/g, '-$1').toLowerCase());
      }
    } else if (Array.isArray(value) && value.length > 0) {
      let directiveValue = value.join(' ');

      // Replace nonce placeholder if provided
      if (nonce && directiveValue.includes('{NONCE}')) {
        directiveValue = directiveValue.replace('{NONCE}', nonce);
      }

      policies.push(`${directive.replace(/([A-Z])/g, '-$1').toLowerCase()} ${directiveValue}`);
    }
  });

  return policies.join('; ');
};

export const generateSecurityHeaders = (env: 'development' | 'production' = 'production') => {
  const nonce = crypto.randomUUID();
  const cspDirectives = getCSPDirectives(env);

  return {
    // Content Security Policy
    'Content-Security-Policy': generateCSPHeader(cspDirectives, nonce),

    // Additional security headers
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': [
      'accelerometer=()',
      'camera=()',
      'geolocation=()',
      'gyroscope=()',
      'magnetometer=()',
      'microphone=()',
      'payment=(self)',
      'usb=()',
    ].join(', '),

    // HSTS (HTTP Strict Transport Security)
    ...(env === 'production' && {
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
    }),

    // Expose nonce for inline scripts
    'X-Nonce': nonce,
  };
};

// Cloudflare Workers middleware for security headers
export const addSecurityHeaders = (response: Response, env: 'development' | 'production' = 'production'): Response => {
  const headers = generateSecurityHeaders(env);

  Object.entries(headers).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  return response;
};