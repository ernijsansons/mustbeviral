// Data Isolation Middleware
// Ensures proper multi-tenant data separation and access control

import { DatabaseService} from '../lib/db';
import { log} from '../lib/monitoring/logger';

export interface TenantContext {
  organizationId: string;
  userId: string;
  userRole: string;
  permissions: string[];
  teamIds?: string[];
}

export interface IsolatedRequest extends Request {
  tenantContext?: TenantContext;
  user?: {
    id: string;
    email: string;
    organizationId: string;
    role: string;
  };
}

export class DataIsolationMiddleware {
  constructor(private dbService: DatabaseService) {}

  // Main middleware function that adds tenant context to requests
  async isolateData(request: IsolatedRequest): Promise<IsolatedRequest> {
    try {
      // Skip isolation for public routes
      if (this.isPublicRoute(request.url)) {
        return request;
      }

      // Extract user from authenticated request
      const user = (request as unknown).user;
      if (!user  ?? !user.id  ?? !user.organizationId) {
        log.warn('Data isolation skipped - no user context', {
          action: 'data_isolation_skip',
          metadata: { url: request.url }
        });
        return request;
      }

      // Build tenant context
      const tenantContext = await this.buildTenantContext(user);

      // Attach context to request
      request.tenantContext = tenantContext;

      log.debug('Data isolation applied', {
        action: 'data_isolation_applied',
        metadata: {
          organizationId: tenantContext.organizationId,
          userId: tenantContext.userId,
          role: tenantContext.userRole,
          permissionCount: tenantContext.permissions.length
        }
      });

      return request;

    } catch (error: unknown) {
      log.error('Data isolation error', {
        action: 'data_isolation_error',
        metadata: { error: error instanceof Error ? error.message : 'Unknown error' }
      });

      // Return request without context on error (will be handled by auth layer)
      return request;
    }
  }

  // Build comprehensive tenant context for the user
  private async buildTenantContext(user: unknown): Promise<TenantContext> {
    const db = this.dbService.getDatabase();

    // Get user's organization membership details
    const membershipQuery = `
      SELECT
        om.organizationid,
        om.role,
        om.permissions,
        om.teamid,
        o.status as orgstatus,
        o.plan_type
      FROM organization_members om
      JOIN organizations o ON om.organizationid = o.id
      WHERE om.userid = ? AND om.status = 'active' AND o.status = 'active'
    `;

    const membership = await db.prepare(membershipQuery).get(user.id);

    if (!membership) {
      throw new Error('User has no active organization membership');
    }

    // Parse permissions from JSON
    let permissions: string[] = [];
    try {
      permissions = JSON.parse(membership.permissions ?? '[]');
    } catch (_error: unknown) {
      log.warn('Failed to parse user permissions', {
        action: 'permission_parse_error',
        metadata: { userId: user.id, organizationId: membership.organizationid }
      });
    }

    // Add role-based permissions
    const rolePermissions = this.getRolePermissions(membership.role);
    permissions = [...new Set([...permissions, ...rolePermissions])];

    // Get user's team memberships
    const teamQuery = `
      SELECT DISTINCT team_id
      FROM organization_members
      WHERE userid = ? AND organizationid = ? AND team_id IS NOT NULL
    `;

    const teamMemberships = await db.prepare(teamQuery).all(user.id, membership.organizationid);
    const teamIds = teamMemberships.map((tm: unknown) => tm.teamid);

    return {
      organizationId: membership.organizationid,
      userId: user.id,
      userRole: membership.role,
      permissions,
      teamIds: teamIds.length > 0 ? teamIds : undefined
    };
  }

  // Get default permissions for each role
  private getRolePermissions(role: string): string[] {
    const rolePermissionMap: Record<string, string[]> = {
      'owner': [
        'organization.manage',
        'organization.delete',
        'members.manage',
        'teams.manage',
        'content.manage',
        'analytics.view',
        'billing.manage',
        'settings.manage'
      ],
      'admin': [
        'organization.update',
        'members.manage',
        'teams.manage',
        'content.manage',
        'analytics.view',
        'settings.manage'
      ],
      'manager': [
        'organization.view',
        'members.invite',
        'members.view',
        'teams.manage',
        'content.manage',
        'analytics.view'
      ],
      'editor': [
        'organization.view',
        'members.view',
        'teams.view',
        'content.create',
        'content.edit',
        'content.delete'
      ],
      'member': [
        'organization.view',
        'members.view',
        'teams.view',
        'content.create',
        'content.edit'
      ],
      'viewer': [
        'organization.view',
        'members.view',
        'teams.view',
        'content.view'
      ]
    };

    return rolePermissionMap[role]  ?? [];
  }

  // Check if a route should bypass data isolation
  private isPublicRoute(url: string): boolean {
    const publicRoutes = [
      '/api/health',
      '/api/auth/login',
      '/api/auth/register',
      '/api/auth/refresh'
    ];

    const urlPath = new URL(url).pathname;
    return publicRoutes.some(route => urlPath.startsWith(route));
  }

  // Validate that a resource belongs to the user's organization
  async validateResourceAccess(
    tenantContext: TenantContext,
    resourceType: string,
    resourceId: string
  ): Promise<boolean> {
    const db = this.dbService.getDatabase();

    try {
      // Define resource validation queries
      const validationQueries: Record<string, string> = {
        'organization': `
          SELECT 1 FROM organizations
          WHERE id = ? AND id = ? AND status = 'active'
        `,
        'user': `
          SELECT 1 FROM organization_members
          WHERE userid = ? AND organizationid = ? AND status = 'active'
        `,
        'team': `
          SELECT 1 FROM teams
          WHERE id = ? AND organizationid = ?
        `,
        'content': `
          SELECT 1 FROM organization_content
          WHERE contentid = ? AND organizationid = ?
        `,
        'post': `
          SELECT 1 FROM posts
          WHERE id = ? AND organizationid = ?
        `
      };

      const query = validationQueries[resourceType];
      if (!query) {
        log.warn('Unknown resource type for validation', {
          action: 'resource_validation_unknown',
          metadata: { resourceType, resourceId }
        });
        return false;
      }

      const result = await db.prepare(query).get(resourceId, tenantContext.organizationId);

      log.debug('Resource access validation', {
        action: 'resource_validation',
        metadata: { resourceType,
          resourceId,
          organizationId: tenantContext.organizationId,
          hasAccess: !!result
        }
      });

      return !!result;

    } catch (error: unknown) {
      log.error('Resource validation error', {
        action: 'resource_validation_error',
        metadata: { resourceType,
          resourceId,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      });
      return false;
    }
  }

  // Check if user has specific permission
  hasPermission(tenantContext: TenantContext, permission: string): boolean {
    return tenantContext.permissions.includes(permission);
  }

  // Check if user can access team-specific resources
  canAccessTeam(tenantContext: TenantContext, teamId: string): boolean {
    // Organization owners and admins can access all teams
    if (['owner', 'admin'].includes(tenantContext.userRole)) {
      return true;
    }

    // Check if user is member of the specific team
    return tenantContext.teamIds?.includes(teamId)  ?? false;
  }

  // Filter query results based on tenant context
  async applyTenantFilters(
    query: string,
    params: unknown[],
    tenantContext: TenantContext
  ): Promise<{ query: string; params: unknown[] }> {
    // Add organization filter to all queries
    const filteredQuery = query.includes('WHERE')
      ? `${query} AND organizationid = ?`
      : `${query} WHERE organizationid = ?`;

    const filteredParams = [...params, tenantContext.organizationId];

    log.debug('Applied tenant filters', {
      action: 'tenant_filter_applied',
      metadata: {
        organizationId: tenantContext.organizationId,
        originalParamCount: params.length,
        filteredParamCount: filteredParams.length
      }
    });

    return {
      query: filteredQuery,
      params: filteredParams
    };
  }

  // Get tenant-aware database connection with automatic filtering
  getTenantDatabase(tenantContext: TenantContext) {
    const db = this.dbService.getDatabase();

    return {
      // Wrap prepare to automatically add tenant filters
      prepare: (query: string) => {
        return {
          get: async (...params: unknown[]) => {
            const { query: filteredQuery, params: filteredParams} =
              await this.applyTenantFilters(query, params, tenantContext);
            return db.prepare(filteredQuery).get(...filteredParams);
          },
          all: async (...params: unknown[]) => {
            const { query: filteredQuery, params: filteredParams} =
              await this.applyTenantFilters(query, params, tenantContext);
            return db.prepare(filteredQuery).all(...filteredParams);
          },
          run: async (...params: unknown[]) => {
            // For INSERT/UPDATE/DELETE, add organization_id if not present
            const finalQuery = query;
            let finalParams = params;

            if (query.toUpperCase() {
    .includes('INSERT INTO') &&
  }
                !query.includes('organization_id')) {
              // This is a simplified approach - in production you'd want more sophisticated logic
              finalParams = [...params, tenantContext.organizationId];
            }

            return db.prepare(finalQuery).run(...finalParams);
          }
        };
      }
    };
  }
}

// Helper function to create and apply data isolation middleware
export async function withDataIsolation(
  request: IsolatedRequest,
  dbService: DatabaseService
): Promise<IsolatedRequest> {
  const middleware = new DataIsolationMiddleware(dbService);
  return middleware.isolateData(request);
}

// Utility function to ensure user has required permission
export function requirePermission(permission: string) {
  return (tenantContext?: TenantContext): boolean => {
    if (!tenantContext) {
      return false;
    }
    return tenantContext.permissions.includes(permission);
  };
}

// Utility function to ensure user can access organization
export function requireOrganizationAccess(organizationId: string) {
  return (tenantContext?: TenantContext): boolean => {
    if (!tenantContext) {
      return false;
    }
    return tenantContext.organizationId === organizationId;
  };
}