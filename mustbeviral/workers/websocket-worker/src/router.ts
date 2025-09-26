// Simple Router for WebSocket Worker
// Handles HTTP routing for the WebSocket microservice

type RouteHandler = (request: Request, env?: unknown, ctx?: unknown) => Promise<Response> | Response;

export class Router {
  private routes: Map<string, Map<string, RouteHandler>> = new Map();

  constructor() {
    this.routes.set('GET', new Map());
    this.routes.set('POST', new Map());
    this.routes.set('PUT', new Map());
    this.routes.set('DELETE', new Map());
    this.routes.set('PATCH', new Map());
  }

  get(path: string, handler: RouteHandler): void {
    this.addRoute('GET', path, handler);
  }

  post(path: string, handler: RouteHandler): void {
    this.addRoute('POST', path, handler);
  }

  put(path: string, handler: RouteHandler): void {
    this.addRoute('PUT', path, handler);
  }

  delete(path: string, handler: RouteHandler): void {
    this.addRoute('DELETE', path, handler);
  }

  patch(path: string, handler: RouteHandler): void {
    this.addRoute('PATCH', path, handler);
  }

  private addRoute(method: string, path: string, handler: RouteHandler): void {
    const routes = this.routes.get(method);
    if (routes) {
      routes.set(path, handler);
    }
  }

  async handle(request: Request): Promise<Response | null> {
    const url = new URL(request.url);
    const method = request.method;
    const path = url.pathname;

    const routes = this.routes.get(method);
    if (!routes) {
      return null;
    }

    // Try exact match first
    const exactHandler = routes.get(path);
    if (exactHandler) {
      return await exactHandler(request);
    }

    // Try pattern matching for parameterized routes
    for (const [routePath, handler] of routes.entries()) {
      const match = this.matchRoute(routePath, path);
      if (match) {
        return await handler(request, match.params);
      }
    }

    return null;
  }

  private matchRoute(routePath: string, actualPath: string): { params: Record<string, string> } | null {
    const routeParts = routePath.split('/');
    const actualParts = actualPath.split('/');

    if (routeParts.length !== actualParts.length) {
      return null;
    }

    const params: Record<string, string> = {};

    for (let i = 0; i < routeParts.length; i++) {
      const routePart = routeParts[i];
      const actualPart = actualParts[i];

      if (routePart.startsWith(':')) {
        // Parameter
        const paramName = routePart.slice(1);
        params[paramName] = decodeURIComponent(actualPart);
      } else if (routePart !== actualPart) {
        // No match
        return null;
      }
    }

    return { params };
  }
}