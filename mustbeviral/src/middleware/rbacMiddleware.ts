// RBAC Middleware
// Enforces role-based access control on API endpoints

import { RBACService} from '../lib/rbac/rbacService';
import { IsolatedRequest} from './dataIsolation';
import { log} from '../lib/monitoring/logger';

export interface RBACRequirement {
  permission?: string;
  permissions?: string[];
  requireAll?: boolean; // If true, user must have ALL permissions; if false, ANY permission
  resource?: string;
  action?: string;
  customValidator?: (request: IsolatedRequest) => Promise<boolean>;
}

export class RBACMiddleware {
  constructor(private rbacService: RBACService) {}

  // Create middleware function for specific permission requirements
  requirePermission(requirement: RBACRequirement) {
    return async (request: IsolatedRequest): Promise<boolean> => {
      try {
        // Check if user is authenticated and has tenant context
        if (!request.tenantContext  ?? !request.user) {
          log.warn('RBAC check failed - no tenant context', {
            action: 'rbac_no_context',
            metadata: { url: request.url }
          });
          return false;
        }

        const { userId, organizationId} = request.tenantContext;

        // Single permission check
        if (requirement.permission) {
          const hasPermission = await this.rbacService.hasPermission(
            userId,
            organizationId,
            requirement.permission
          );

          log.debug('RBAC permission check', {
            action: 'rbac_permission_check',
            metadata: { userId,
              organizationId,
              permission: requirement.permission,
              hasPermission
            }
          });

          return hasPermission;
        }

        // Multiple permissions check
        if (requirement.permissions && requirement.permissions.length > 0) {
          let hasPermissions = false;

          if (requirement.requireAll) {
            // User must have ALL permissions
            hasPermissions = true;
            for (const permission of requirement.permissions) {
              const hasPermission = await this.rbacService.hasPermission(
                userId,
                organizationId,
                permission
              );
              if (!hasPermission) {
                hasPermissions = false;
                break;
              }
            }
          } else {
            // User must have ANY permission
            hasPermissions = await this.rbacService.hasAnyPermission(
              userId,
              organizationId,
              requirement.permissions
            );
          }

          log.debug('RBAC multiple permissions check', {
            action: 'rbac_multiple_permissions_check',
            metadata: { userId,
              organizationId,
              permissions: requirement.permissions,
              requireAll: requirement.requireAll ?? false,
              hasPermissions
            }
          });

          return hasPermissions;
        }

        // Resource-action based check
        if (requirement.resource && requirement.action) {
          const canAccess = await this.rbacService.canAccessResource(
            userId,
            organizationId,
            requirement.resource,
            requirement.action
          );

          log.debug('RBAC resource access check', {
            action: 'rbac_resource_access_check',
            metadata: { userId,
              organizationId,
              resource: requirement.resource,
              action: requirement.action,
              canAccess
            }
          });

          return canAccess;
        }

        // Custom validator
        if (requirement.customValidator) {
          const isValid = await requirement.customValidator(request);

          log.debug('RBAC custom validation', {
            action: 'rbac_custom_validation',
            metadata: { userId,
              organizationId,
              isValid
            }
          });

          return isValid;
        }

        // No requirements specified
        log.warn('RBAC check called with no requirements', {
          action: 'rbac_no_requirements',
          metadata: { userId, organizationId }
        });

        return false;

      } catch (error: unknown) {
        log.error('RBAC check error', {
          action: 'rbac_check_error',
          metadata: {
            error: error instanceof Error ? error.message : 'Unknown error',
            url: request.url
          }
        });
        return false;
      }
    };
  }

  // Middleware for organization owner only
  requireOwner() {
    return this.requirePermission({
      customValidator: async (request: IsolatedRequest) => {
        if (!request.tenantContext) {
    return false;
  }
        return request.tenantContext.userRole === 'owner';
      }
    });
  }

  // Middleware for admin or higher
  requireAdmin() {
    return this.requirePermission({
      customValidator: async (request: IsolatedRequest) => {
        if (!request.tenantContext) {
    return false;
  }
        return ['owner', 'admin'].includes(request.tenantContext.userRole);
      }
    });
  }

  // Middleware for manager or higher
  requireManager() {
    return this.requirePermission({
      customValidator: async (request: IsolatedRequest) => {
        if (!request.tenantContext) {
    return false;
  }
        return ['owner', 'admin', 'manager'].includes(request.tenantContext.userRole);
      }
    });
  }

  // Middleware for content management
  requireContentPermission(action: 'view' | 'create' | 'edit' | 'delete' | 'manage' | 'publish') {
    return this.requirePermission({
      resource: 'content',
      action: action
    });
  }

  // Middleware for member management
  requireMemberPermission(action: 'view' | 'invite' | 'manage' | 'remove') {
    return this.requirePermission({
      resource: 'members',
      action: action
    });
  }

  // Middleware for team management
  requireTeamPermission(action: 'view' | 'create' | 'manage') {
    return this.requirePermission({
      resource: 'teams',
      action: action
    });
  }

  // Middleware for organization management
  requireOrganizationPermission(action: 'view' | 'update' | 'delete' | 'manage') {
    return this.requirePermission({
      resource: 'organization',
      action: action
    });
  }

  // Middleware to check if user can manage another user
  requireUserManagement(targetUserIdParam: string = 'userId') {
    return this.requirePermission({
      customValidator: async (request: IsolatedRequest) => {
        if (!request.tenantContext) {
    return false;
  }

        // Extract target user ID from URL parameters
        const url = new URL(request.url);
        const pathSegments = url.pathname.split('/');
        const targetUserId = pathSegments.find((segment, index) => {
          const prevSegment = pathSegments[index - 1];
          return prevSegment === targetUserIdParam.replace(':', '');
        });

        if (!targetUserId) {
          return false;
        }

        return this.rbacService.canManageUser(
          request.tenantContext.userId,
          targetUserId,
          request.tenantContext.organizationId
        );
      }
    });
  }

  // Middleware to check content access for specific content ID
  requireContentAccess(action: 'view' | 'edit' | 'delete' | 'publish', contentIdParam: string = 'contentId') {
    return this.requirePermission({
      customValidator: async (request: IsolatedRequest) => {
        if (!request.tenantContext) {
    return false;
  }

        // Extract content ID from URL parameters
        const url = new URL(request.url);
        const pathSegments = url.pathname.split('/');
        const contentId = pathSegments.find((segment, index) => {
          const prevSegment = pathSegments[index - 1];
          return prevSegment === contentIdParam.replace(':', '');
        });

        if (!contentId) {
          return false;
        }

        return this.rbacService.validateContentAccess(
          request.tenantContext.userId,
          request.tenantContext.organizationId,
          contentId,
          action
        );
      }
    });
  }

  // Middleware to check team access
  requireTeamAccess(teamIdParam: string = 'teamId') {
    return this.requirePermission({
      customValidator: async (request: IsolatedRequest) => {
        if (!request.tenantContext) {
    return false;
  }

        // Extract team ID from URL parameters
        const url = new URL(request.url);
        const pathSegments = url.pathname.split('/');
        const teamId = pathSegments.find((segment, index) => {
          const prevSegment = pathSegments[index - 1];
          return prevSegment === teamIdParam.replace(':', '');
        });

        if (!teamId) {
          return false;
        }

        // Owners and admins can access all teams
        if (['owner', 'admin'].includes(request.tenantContext.userRole)) {
          return true;
        }

        // Check if user is member of the specific team
        return request.tenantContext.teamIds?.includes(teamId)  ?? false;
      }
    });
  }
}

// Helper function to create RBAC response
export function createRBACResponse(
  success: boolean,
  message: string = '',
  statusCode: number = success ? 200 : 403
): Response {
  const responseBody = { success,
    error: success ? undefined : (message ?? 'Insufficient permissions'),
    timestamp: new Date().toISOString()
  };

  return new Response(JSON.stringify(responseBody), {
    status: statusCode,
    headers: { 'Content-Type': 'application/json' }
  });
}

// Decorator-style helper for applying RBAC to route handlers
export function withRBAC(requirement: RBACRequirement, rbacService: RBACService) {
  const middleware = new RBACMiddleware(rbacService);
  const validator = middleware.requirePermission(requirement);

  return function (
    originalHandler: (request: IsolatedRequest, ...args: unknown[]) => Promise<Response>
  ) {
    return async function (request: IsolatedRequest, ...args: unknown[]): Promise<Response> {
      // Apply RBAC check
      const hasAccess = await validator(request);

      if (!hasAccess) {
        log.warn('RBAC access denied', {
          action: 'rbac_access_denied',
          metadata: {
            url: request.url,
            userId: request.tenantContext?.userId,
            organizationId: request.tenantContext?.organizationId,
            requirement
          }
        });

        return createRBACResponse(false, 'Access denied: insufficient permissions', 403);
      }

      // Call original handler if access is granted
      return originalHandler(request, ...args);
    };
  };
}

// Utility functions for common RBAC patterns

// Check if current user owns the resource
export async function isResourceOwner(
  request: IsolatedRequest,
  resourceOwnerIdField: string,
  _resourceId: string,
  _rbacService: RBACService
): Promise<boolean> {
  if (!request.tenantContext) {
    return false;
  }

  // Implementation would depend on how ownership is stored
  // This is a simplified version
  return request.tenantContext.userId === resourceOwnerIdField;
}

// Check if user has elevated permissions (admin or owner)
export function hasElevatedPermissions(request: IsolatedRequest): boolean {
  if (!request.tenantContext) {
    return false;
  }
  return ['owner', 'admin'].includes(request.tenantContext.userRole);
}

// Check if user can perform action on organization
export async function canPerformOrganizationAction(
  request: IsolatedRequest,
  action: string,
  rbacService: RBACService
): Promise<boolean> {
  if (!request.tenantContext) {
    return false;
  }

  return rbacService.hasPermission(
    request.tenantContext.userId,
    request.tenantContext.organizationId,
    `organization.${action}`
  );
}