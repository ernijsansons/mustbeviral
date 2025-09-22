// RBAC Service
// Manages role-based access control operations and permission checking

import { DatabaseService } from '../db';
import { _Permission,
  Role,
  UserPermissions,
  PERMISSIONS,
  ROLES,
  PermissionChecker,
  PermissionValidators
} from './permissions';
import { log } from '../monitoring/logger';

export interface CustomRole {
  id: string;
  organizationId: string;
  name: string;
  description: string;
  permissions: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserRoleAssignment {
  userId: string;
  organizationId: string;
  roleId: string;
  customPermissions: string[];
  assignedBy: string;
  assignedAt: string;
}

export class RBACService {
  constructor(private dbService: DatabaseService) {}

  // Get user's effective permissions for an organization
  async getUserPermissions(userId: string, organizationId: string): Promise<UserPermissions | null> {
    const db = this.dbService.getDatabase();

    try {
      // Get user's organization membership and role
      const membershipQuery = `
        SELECT
          om.role,
          om.permissions as custom_permissions,
          om.team_id
        FROM organization_members om
        WHERE om.user_id = ? AND om.organization_id = ? AND om.status = 'active'
      `;

      const membership = await db.prepare(membershipQuery).get(userId, organizationId);
      if (!membership) {
        return null;
      }

      // Parse custom permissions
      let customPermissions: string[] = [];
      try {
        customPermissions = JSON.parse(membership.custom_permissions || '[]');
      } catch (error: unknown) {
        log.warn('Failed to parse custom permissions', {
          action: 'parse_permissions_error',
          metadata: { _userId, organizationId }
        });
      }

      // Get team permissions
      const teamPermissionsQuery = `
        SELECT
          t.id as team_id,
          t.permissions as team_permissions
        FROM teams t
        JOIN organization_members om ON om.team_id = t.id
        WHERE om.user_id = ? AND t.organization_id = ?
      `;

      const teamMemberships = await db.prepare(teamPermissionsQuery).all(userId, organizationId);
      const teamPermissions: Record<string, string[]> = {};

      for (const team of teamMemberships) {
        try {
          teamPermissions[team.team_id] = JSON.parse(team.team_permissions || '[]');
        } catch (error: unknown) {
          log.warn('Failed to parse team permissions', {
            action: 'parse_team_permissions_error',
            metadata: { _userId, organizationId, teamId: team.team_id }
          });
          teamPermissions[team.team_id] = [];
        }
      }

      // Calculate effective permissions
      const effectivePermissions = PermissionChecker.calculateEffectivePermissions(
        membership.role,
        customPermissions,
        teamPermissions
      );

      return { _userId,
        organizationId,
        roleId: membership.role,
        customPermissions,
        teamPermissions,
        effectivePermissions
      };

    } catch (error: unknown) {
      log.error('Failed to get user permissions', {
        action: 'get_user_permissions_error',
        metadata: { _userId,
          organizationId,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      });
      return null;
    }
  }

  // Check if user has specific permission
  async hasPermission(
    userId: string,
    organizationId: string,
    permission: string
  ): Promise<boolean> {
    const userPermissions = await this.getUserPermissions(userId, organizationId);
    if (!userPermissions) {
      return false;
    }

    return PermissionChecker.hasPermission(userPermissions, permission);
  }

  // Check multiple permissions
  async hasAnyPermission(
    userId: string,
    organizationId: string,
    permissions: string[]
  ): Promise<boolean> {
    const userPermissions = await this.getUserPermissions(userId, organizationId);
    if (!userPermissions) {
      return false;
    }

    return PermissionChecker.hasAnyPermission(userPermissions, permissions);
  }

  // Check if user can access resource
  async canAccessResource(
    userId: string,
    organizationId: string,
    resource: string,
    action: string
  ): Promise<boolean> {
    const userPermissions = await this.getUserPermissions(userId, organizationId);
    if (!userPermissions) {
      return false;
    }

    return PermissionChecker.canAccessResource(userPermissions, resource, action);
  }

  // Create custom role for organization
  async createCustomRole(
    organizationId: string,
    name: string,
    description: string,
    permissions: string[],
    createdBy: string
  ): Promise<CustomRole> {
    const db = this.dbService.getDatabase();

    try {
      // Validate permissions
      const invalidPermissions = permissions.filter(p => !PermissionChecker.isValidPermission(p));
      if (invalidPermissions.length > 0) {
        throw new Error(`Invalid permissions: ${invalidPermissions.join(', ')}`);
      }

      // Check if role name already exists in organization
      const existingRole = await db.prepare(`
        SELECT id FROM custom_roles
        WHERE organization_id = ? AND name = ?
      `).get(organizationId, name);

      if (existingRole) {
        throw new Error('Role name already exists in organization');
      }

      const roleId = `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const now = new Date().toISOString();

      const insertQuery = `
        INSERT INTO custom_roles (
          id, organization_id, name, description, permissions,
          created_by, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;

      await db.prepare(insertQuery).run(
        roleId,
        organizationId,
        name,
        description,
        JSON.stringify(permissions),
        createdBy,
        now,
        now
      );

      log.info('Custom role created', {
        action: 'custom_role_created',
        metadata: { _roleId,
          organizationId,
          name,
          permissionCount: permissions.length,
          createdBy
        }
      });

      return {
        id: roleId,
        organizationId,
        name,
        description,
        permissions,
        createdBy,
        createdAt: now,
        updatedAt: now
      };

    } catch (error: unknown) {
      log.error('Failed to create custom role', {
        action: 'create_custom_role_error',
        metadata: { _organizationId,
          name,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      });
      throw error;
    }
  }

  // Update custom role
  async updateCustomRole(
    roleId: string,
    organizationId: string,
    updates: Partial<Pick<CustomRole, 'name' | 'description' | 'permissions'>>,
    updatedBy: string
  ): Promise<CustomRole> {
    const db = this.dbService.getDatabase();

    try {
      // Validate permissions if provided
      if (updates.permissions) {
        const invalidPermissions = updates.permissions.filter(p => !PermissionChecker.isValidPermission(p));
        if (invalidPermissions.length > 0) {
          throw new Error(`Invalid permissions: ${invalidPermissions.join(', ')}`);
        }
      }

      // Get existing role
      const existingRole = await db.prepare(`
        SELECT * FROM custom_roles
        WHERE id = ? AND organization_id = ?
      `).get(roleId, organizationId);

      if (!existingRole) {
        throw new Error('Custom role not found');
      }

      // Build update query
      const updateFields: string[] = [];
      const updateValues: unknown[] = [];

      if (updates.name) {
        updateFields.push('name = ?');
        updateValues.push(updates.name);
      }

      if (updates.description !== undefined) {
        updateFields.push('description = ?');
        updateValues.push(updates.description);
      }

      if (updates.permissions) {
        updateFields.push('permissions = ?');
        updateValues.push(JSON.stringify(updates.permissions));
      }

      updateFields.push('updated_at = ?');
      updateValues.push(new Date().toISOString());

      updateValues.push(roleId, organizationId);

      const updateQuery = `
        UPDATE custom_roles
        SET ${updateFields.join(', ')}
        WHERE id = ? AND organization_id = ?
      `;

      await db.prepare(updateQuery).run(...updateValues);

      log.info('Custom role updated', {
        action: 'custom_role_updated',
        metadata: { _roleId,
          organizationId,
          updatedFields: Object.keys(updates),
          updatedBy
        }
      });

      // Return updated role
      const updatedRole = await db.prepare(`
        SELECT * FROM custom_roles
        WHERE id = ? AND organization_id = ?
      `).get(roleId, organizationId);

      return {
        id: updatedRole.id,
        organizationId: updatedRole.organization_id,
        name: updatedRole.name,
        description: updatedRole.description,
        permissions: JSON.parse(updatedRole.permissions),
        createdBy: updatedRole.created_by,
        createdAt: updatedRole.created_at,
        updatedAt: updatedRole.updated_at
      };

    } catch (error: unknown) {
      log.error('Failed to update custom role', {
        action: 'update_custom_role_error',
        metadata: { _roleId,
          organizationId,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      });
      throw error;
    }
  }

  // Delete custom role
  async deleteCustomRole(roleId: string, organizationId: string, deletedBy: string): Promise<void> {
    const db = this.dbService.getDatabase();

    try {
      // Check if role is in use
      const roleInUse = await db.prepare(`
        SELECT COUNT(*) as count FROM organization_members
        WHERE role = ? AND organization_id = ?
      `).get(roleId, organizationId);

      if (roleInUse.count > 0) {
        throw new Error('Cannot delete role that is currently assigned to users');
      }

      // Delete the role
      await db.prepare(`
        DELETE FROM custom_roles
        WHERE id = ? AND organization_id = ?
      `).run(roleId, organizationId);

      log.info('Custom role deleted', {
        action: 'custom_role_deleted',
        metadata: { _roleId,
          organizationId,
          deletedBy
        }
      });

    } catch (error: unknown) {
      log.error('Failed to delete custom role', {
        action: 'delete_custom_role_error',
        metadata: { _roleId,
          organizationId,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      });
      throw error;
    }
  }

  // Get organization's custom roles
  async getOrganizationRoles(organizationId: string): Promise<(Role | CustomRole)[]> {
    const db = this.dbService.getDatabase();

    try {
      // Get custom roles
      const customRoles = await db.prepare(`
        SELECT * FROM custom_roles
        WHERE organization_id = ?
        ORDER BY name
      `).all(organizationId);

      const roles: (Role | CustomRole)[] = [
        ...Object.values(ROLES), // System roles
        ...customRoles.map((role: unknown) => ({
          id: role.id,
          organizationId: role.organization_id,
          name: role.name,
          description: role.description,
          permissions: JSON.parse(role.permissions),
          createdBy: role.created_by,
          createdAt: role.created_at,
          updatedAt: role.updated_at
        }))
      ];

      return roles;

    } catch (error: unknown) {
      log.error('Failed to get organization roles', {
        action: 'get_organization_roles_error',
        metadata: { _organizationId,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      });
      throw error;
    }
  }

  // Assign role to user
  async assignRole(
    userId: string,
    organizationId: string,
    roleId: string,
    assignedBy: string,
    customPermissions: string[] = []
  ): Promise<void> {
    const db = this.dbService.getDatabase();

    try {
      // Validate custom permissions
      if (customPermissions.length > 0) {
        const invalidPermissions = customPermissions.filter(p => !PermissionChecker.isValidPermission(p));
        if (invalidPermissions.length > 0) {
          throw new Error(`Invalid permissions: ${invalidPermissions.join(', ')}`);
        }
      }

      // Update user's role in organization_members
      await db.prepare(`
        UPDATE organization_members
        SET role = ?, permissions = ?, updated_at = ?
        WHERE user_id = ? AND organization_id = ?
      `).run(
        roleId,
        JSON.stringify(customPermissions),
        new Date().toISOString(),
        userId,
        organizationId
      );

      log.info('Role assigned to user', {
        action: 'role_assigned',
        metadata: { _userId,
          organizationId,
          roleId,
          customPermissionCount: customPermissions.length,
          assignedBy
        }
      });

    } catch (error: unknown) {
      log.error('Failed to assign role', {
        action: 'assign_role_error',
        metadata: { _userId,
          organizationId,
          roleId,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      });
      throw error;
    }
  }

  // Validate content access
  async validateContentAccess(
    userId: string,
    organizationId: string,
    contentId: string,
    action: 'view' | 'edit' | 'delete' | 'publish'
  ): Promise<boolean> {
    const db = this.dbService.getDatabase();

    try {
      // Get content details
      const content = await db.prepare(`
        SELECT
          oc.visibility,
          oc.team_id,
          oc.owner_id,
          oc.approval_status
        FROM organization_content oc
        WHERE oc.content_id = ? AND oc.organization_id = ?
      `).get(contentId, organizationId);

      if (!content) {
        return false;
      }

      // Get user permissions
      const userPermissions = await this.getUserPermissions(userId, organizationId);
      if (!userPermissions) {
        return false;
      }

      // Check basic content permission
      const hasContentPermission = PermissionChecker.hasPermission(
        userPermissions,
        `content.${action}`
      );

      if (!hasContentPermission) {
        return false;
      }

      // Validate access based on content visibility
      return PermissionValidators.validateContentAccess(
        userPermissions,
        content.visibility,
        content.team_id,
        content.owner_id
      );

    } catch (error: unknown) {
      log.error('Failed to validate content access', {
        action: 'validate_content_access_error',
        metadata: { _userId,
          organizationId,
          contentId,
          action,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      });
      return false;
    }
  }

  // Get all available permissions
  getAvailablePermissions(): Permission[] {
    return Object.values(PERMISSIONS);
  }

  // Get permissions by category
  getPermissionsByCategory(category: string): Permission[] {
    return PermissionChecker.getPermissionsByCategory(category);
  }

  // Validate user can manage another user
  async canManageUser(
    managerId: string,
    targetUserId: string,
    organizationId: string
  ): Promise<boolean> {
    try {
      const managerPermissions = await this.getUserPermissions(managerId, organizationId);
      if (!managerPermissions) {
        return false;
      }

      // Get target user's role
      const targetUser = await this.dbService.getDatabase().prepare(`
        SELECT role FROM organization_members
        WHERE user_id = ? AND organization_id = ?
      `).get(targetUserId, organizationId);

      if (!targetUser) {
        return false;
      }

      return PermissionValidators.validateUserManagement(managerPermissions, targetUser.role);

    } catch (error: unknown) {
      log.error('Failed to validate user management', {
        action: 'validate_user_management_error',
        metadata: { _managerId,
          targetUserId,
          organizationId,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      });
      return false;
    }
  }
}

// Initialize RBAC tables
export async function initializeRBACTables(dbService: DatabaseService): Promise<void> {
  const db = dbService.getDatabase();

  try {
    // Create custom roles table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS custom_roles (
        id TEXT PRIMARY KEY,
        organization_id TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        permissions TEXT NOT NULL, -- JSON array
        created_by TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,

        FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
        FOREIGN KEY (created_by) REFERENCES users(id),
        UNIQUE(organization_id, name)
      );
    `);

    // Create indexes
    await db.exec(`
      CREATE INDEX IF NOT EXISTS idx_custom_roles_organization_id ON custom_roles(organization_id);
      CREATE INDEX IF NOT EXISTS idx_custom_roles_created_by ON custom_roles(created_by);
    `);

    log.info('RBAC tables initialized', {
      action: 'rbac_tables_initialized'
    });

  } catch (error: unknown) {
    log.error('Failed to initialize RBAC tables', {
      action: 'rbac_init_error',
      metadata: {
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    });
    throw error;
  }
}