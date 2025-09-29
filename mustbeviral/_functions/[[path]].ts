// Cloudflare Pages Functions for Must Be Viral
// This file handles all client-side routing for the SPA

export async function onRequestGet(context: any) {
  const { request, env, next } = context;

  // Get the pathname from the request
  const url = new URL(request.url);
  const pathname = url.pathname;

  // Static asset handling
  if (pathname.includes('.') && !pathname.endsWith('.html')) {
    // For assets like .js, .css, .svg, etc., try to serve them directly
    return next();
  }

  // API routes should be handled by Workers
  if (pathname.startsWith('/api/')) {
    return new Response('API routes handled by Workers', {
      status: 404,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  // For all other routes, serve the index.html (SPA routing)
  try {
    const indexResponse = await next('/index.html');

    // Add security headers
    const newHeaders = new Headers(indexResponse.headers);
    newHeaders.set('X-Frame-Options', 'DENY');
    newHeaders.set('X-Content-Type-Options', 'nosniff');
    newHeaders.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    newHeaders.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

    // CSP for production security
    if (env.NODE_ENV === 'production') {
      newHeaders.set(
        'Content-Security-Policy',
        "default-src 'self'; " +
        "script-src 'self' 'unsafe-inline' https://js.stripe.com; " +
        "style-src 'self' 'unsafe-inline'; " +
        "img-src 'self' data: https:; " +
        "connect-src 'self' https://must-be-viral-prod.ernijs-ansons.workers.dev https://api.stripe.com; " +
        "font-src 'self' https://fonts.gstatic.com; " +
        "frame-src https://js.stripe.com https://hooks.stripe.com;"
      );
    }

    return new Response(indexResponse.body, {
      status: indexResponse.status,
      headers: newHeaders
    });
  } catch (error) {
    return new Response('Page not found', { status: 404 });
  }
}