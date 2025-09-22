// RBAC Permissions System
// Provides granular role-based access control for multi-tenant operations

export interface Permission {
  id: string;
  name: string;
  description: string;
  category: string;
  resource: string;
  action: string;
  scope: 'organization' | 'team' | 'user' | 'global';
}

export interface Role {
  id: string;
  name: string;
  description: string;
  level: number; // Hierarchy level (higher = more privileged)
  permissions: string[];
  isSystemRole: boolean;
}

export interface UserPermissions {
  userId: string;
  organizationId: string;
  roleId: string;
  customPermissions: string[];
  teamPermissions: Record<string, string[]>; // teamId -> permissions
  effectivePermissions: string[];
}

// Core system permissions
export const PERMISSIONS: Record<string, Permission> = {
  // Organization Management
  'organization.view': {
    id: 'organization.view',
    name: 'View Organization',
    description: 'View organization details and settings',
    category: 'Organization',
    resource: 'organization',
    action: 'view',
    scope: 'organization'
  },
  'organization.update': {
    id: 'organization.update',
    name: 'Update Organization',
    description: 'Update organization settings and information',
    category: 'Organization',
    resource: 'organization',
    action: 'update',
    scope: 'organization'
  },
  'organization.delete': {
    id: 'organization.delete',
    name: 'Delete Organization',
    description: 'Delete organization (destructive action)',
    category: 'Organization',
    resource: 'organization',
    action: 'delete',
    scope: 'organization'
  },
  'organization.manage': {
    id: 'organization.manage',
    name: 'Manage Organization',
    description: 'Full organization management including deletion',
    category: 'Organization',
    resource: 'organization',
    action: 'manage',
    scope: 'organization'
  },

  // Member Management
  'members.view': {
    id: 'members.view',
    name: 'View Members',
    description: 'View organization members and their roles',
    category: 'Members',
    resource: 'members',
    action: 'view',
    scope: 'organization'
  },
  'members.invite': {
    id: 'members.invite',
    name: 'Invite Members',
    description: 'Invite new members to the organization',
    category: 'Members',
    resource: 'members',
    action: 'invite',
    scope: 'organization'
  },
  'members.manage': {
    id: 'members.manage',
    name: 'Manage Members',
    description: 'Full member management including role changes and removal',
    category: 'Members',
    resource: 'members',
    action: 'manage',
    scope: 'organization'
  },
  'members.remove': {
    id: 'members.remove',
    name: 'Remove Members',
    description: 'Remove members from organization',
    category: 'Members',
    resource: 'members',
    action: 'remove',
    scope: 'organization'
  },

  // Team Management
  'teams.view': {
    id: 'teams.view',
    name: 'View Teams',
    description: 'View teams and team members',
    category: 'Teams',
    resource: 'teams',
    action: 'view',
    scope: 'organization'
  },
  'teams.create': {
    id: 'teams.create',
    name: 'Create Teams',
    description: 'Create new teams',
    category: 'Teams',
    resource: 'teams',
    action: 'create',
    scope: 'organization'
  },
  'teams.manage': {
    id: 'teams.manage',
    name: 'Manage Teams',
    description: 'Full team management including deletion',
    category: 'Teams',
    resource: 'teams',
    action: 'manage',
    scope: 'organization'
  },

  // Content Management
  'content.view': {
    id: 'content.view',
    name: 'View Content',
    description: 'View all organization content',
    category: 'Content',
    resource: 'content',
    action: 'view',
    scope: 'organization'
  },
  'content.create': {
    id: 'content.create',
    name: 'Create Content',
    description: 'Create new content items',
    category: 'Content',
    resource: 'content',
    action: 'create',
    scope: 'organization'
  },
  'content.edit': {
    id: 'content.edit',
    name: 'Edit Content',
    description: 'Edit existing content',
    category: 'Content',
    resource: 'content',
    action: 'edit',
    scope: 'organization'
  },
  'content.delete': {
    id: 'content.delete',
    name: 'Delete Content',
    description: 'Delete content items',
    category: 'Content',
    resource: 'content',
    action: 'delete',
    scope: 'organization'
  },
  'content.manage': {
    id: 'content.manage',
    name: 'Manage Content',
    description: 'Full content management including approval workflow',
    category: 'Content',
    resource: 'content',
    action: 'manage',
    scope: 'organization'
  },
  'content.publish': {
    id: 'content.publish',
    name: 'Publish Content',
    description: 'Publish content to external platforms',
    category: 'Content',
    resource: 'content',
    action: 'publish',
    scope: 'organization'
  },

  // Analytics & Reporting
  'analytics.view': {
    id: 'analytics.view',
    name: 'View Analytics',
    description: 'View analytics and reports',
    category: 'Analytics',
    resource: 'analytics',
    action: 'view',
    scope: 'organization'
  },
  'analytics.export': {
    id: 'analytics.export',
    name: 'Export Analytics',
    description: 'Export analytics data and reports',
    category: 'Analytics',
    resource: 'analytics',
    action: 'export',
    scope: 'organization'
  },

  // Billing & Subscription
  'billing.view': {
    id: 'billing.view',
    name: 'View Billing',
    description: 'View billing information and usage',
    category: 'Billing',
    resource: 'billing',
    action: 'view',
    scope: 'organization'
  },
  'billing.manage': {
    id: 'billing.manage',
    name: 'Manage Billing',
    description: 'Manage billing, subscriptions, and payments',
    category: 'Billing',
    resource: 'billing',
    action: 'manage',
    scope: 'organization'
  },

  // Settings & Configuration
  'settings.view': {
    id: 'settings.view',
    name: 'View Settings',
    description: 'View organization settings',
    category: 'Settings',
    resource: 'settings',
    action: 'view',
    scope: 'organization'
  },
  'settings.manage': {
    id: 'settings.manage',
    name: 'Manage Settings',
    description: 'Manage organization settings and configuration',
    category: 'Settings',
    resource: 'settings',
    action: 'manage',
    scope: 'organization'
  },

  // AI & ML Features
  'ai.use': {
    id: 'ai.use',
    name: 'Use AI Features',
    description: 'Use AI content generation and analysis',
    category: 'AI',
    resource: 'ai',
    action: 'use',
    scope: 'organization'
  },
  'ai.configure': {
    id: 'ai.configure',
    name: 'Configure AI',
    description: 'Configure AI settings and parameters',
    category: 'AI',
    resource: 'ai',
    action: 'configure',
    scope: 'organization'
  },

  // Activity & Audit
  'activity.view': {
    id: 'activity.view',
    name: 'View Activity',
    description: 'View activity logs and audit trails',
    category: 'Activity',
    resource: 'activity',
    action: 'view',
    scope: 'organization'
  },

  // API Access
  'api.use': {
    id: 'api.use',
    name: 'Use API',
    description: 'Access organization APIs',
    category: 'API',
    resource: 'api',
    action: 'use',
    scope: 'organization'
  },
  'api.manage': {
    id: 'api.manage',
    name: 'Manage API',
    description: 'Manage API keys and configurations',
    category: 'API',
    resource: 'api',
    action: 'manage',
    scope: 'organization'
  }
};

// System roles with predefined permissions
export const ROLES: Record<string, Role> = {
  'owner': {
    id: 'owner',
    name: 'Owner',
    description: 'Organization owner with full access',
    level: 100,
    permissions: Object.keys(PERMISSIONS),
    isSystemRole: true
  },
  'admin': {
    id: 'admin',
    name: 'Administrator',
    description: 'Administrator with broad management access',
    level: 80,
    permissions: [
      'organization.view',
      'organization.update',
      'members.view',
      'members.invite',
      'members.manage',
      'teams.view',
      'teams.create',
      'teams.manage',
      'content.view',
      'content.create',
      'content.edit',
      'content.delete',
      'content.manage',
      'content.publish',
      'analytics.view',
      'analytics.export',
      'billing.view',
      'settings.view',
      'settings.manage',
      'ai.use',
      'ai.configure',
      'activity.view',
      'api.use',
      'api.manage'
    ],
    isSystemRole: true
  },
  'manager': {
    id: 'manager',
    name: 'Manager',
    description: 'Team manager with content and member management',
    level: 60,
    permissions: [
      'organization.view',
      'members.view',
      'members.invite',
      'teams.view',
      'teams.create',
      'teams.manage',
      'content.view',
      'content.create',
      'content.edit',
      'content.delete',
      'content.manage',
      'content.publish',
      'analytics.view',
      'ai.use',
      'activity.view',
      'api.use'
    ],
    isSystemRole: true
  },
  'editor': {
    id: 'editor',
    name: 'Editor',
    description: 'Content editor with creation and editing rights',
    level: 40,
    permissions: [
      'organization.view',
      'members.view',
      'teams.view',
      'content.view',
      'content.create',
      'content.edit',
      'content.delete',
      'content.publish',
      'analytics.view',
      'ai.use',
      'api.use'
    ],
    isSystemRole: true
  },
  'member': {
    id: 'member',
    name: 'Member',
    description: 'Regular member with content creation access',
    level: 20,
    permissions: [
      'organization.view',
      'members.view',
      'teams.view',
      'content.view',
      'content.create',
      'content.edit',
      'ai.use',
      'api.use'
    ],
    isSystemRole: true
  },
  'viewer': {
    id: 'viewer',
    name: 'Viewer',
    description: 'Read-only access to organization content',
    level: 10,
    permissions: [
      'organization.view',
      'members.view',
      'teams.view',
      'content.view'
    ],
    isSystemRole: true
  }
};

// Permission categories for UI organization
export const PERMISSION_CATEGORIES = [
  {
    id: 'organization',
    name: 'Organization',
    description: 'Organization-level settings and management'
  },
  {
    id: 'members',
    name: 'Members',
    description: 'User and member management'
  },
  {
    id: 'teams',
    name: 'Teams',
    description: 'Team creation and management'
  },
  {
    id: 'content',
    name: 'Content',
    description: 'Content creation and management'
  },
  {
    id: 'analytics',
    name: 'Analytics',
    description: 'Analytics and reporting'
  },
  {
    id: 'billing',
    name: 'Billing',
    description: 'Billing and subscription management'
  },
  {
    id: 'settings',
    name: 'Settings',
    description: 'System settings and configuration'
  },
  {
    id: 'ai',
    name: 'AI Features',
    description: 'AI and machine learning features'
  },
  {
    id: 'activity',
    name: 'Activity',
    description: 'Activity logs and audit trails'
  },
  {
    id: 'api',
    name: 'API',
    description: 'API access and management'
  }
];

// Utility functions for permission checking
export class PermissionChecker {
  // Check if a user has a specific permission
  static hasPermission(userPermissions: UserPermissions, permission: string): boolean {
    return userPermissions.effectivePermissions.includes(permission);
  }

  // Check if a user has unknown of the provided permissions
  static hasAnyPermission(userPermissions: UserPermissions, permissions: string[]): boolean {
    return permissions.some(permission => userPermissions.effectivePermissions.includes(permission));
  }

  // Check if a user has all of the provided permissions
  static hasAllPermissions(userPermissions: UserPermissions, permissions: string[]): boolean {
    return permissions.every(permission => userPermissions.effectivePermissions.includes(permission));
  }

  // Check if a user can access a specific resource
  static canAccessResource(
    userPermissions: UserPermissions,
    resource: string,
    action: string
  ): boolean {
    const permission = `${resource}.${action}`;
    return this.hasPermission(userPermissions, permission) ||
           this.hasPermission(userPermissions, `${resource}.manage`);
  }

  // Check if a user can perform an action based on role hierarchy
  static canManageRole(userRole: string, targetRole: string): boolean {
    const userRoleLevel = ROLES[userRole]?.level || 0;
    const targetRoleLevel = ROLES[targetRole]?.level || 0;
    return userRoleLevel > targetRoleLevel;
  }

  // Get all permissions for a role
  static getRolePermissions(roleId: string): string[] {
    return ROLES[roleId]?.permissions || [];
  }

  // Calculate effective permissions for a user
  static calculateEffectivePermissions(
    roleId: string,
    customPermissions: string[] = [],
    teamPermissions: Record<string, string[]> = {}
  ): string[] {
    const rolePermissions = this.getRolePermissions(roleId);
    const allTeamPermissions = Object.values(teamPermissions).flat();

    // Combine and deduplicate permissions
    const allPermissions = [
      ...rolePermissions,
      ...customPermissions,
      ...allTeamPermissions
    ];

    return [...new Set(allPermissions)];
  }

  // Check if a permission exists
  static isValidPermission(permission: string): boolean {
    return permission in PERMISSIONS;
  }

  // Get permissions by category
  static getPermissionsByCategory(category: string): Permission[] {
    return Object.values(PERMISSIONS).filter(p => p.category.toLowerCase() === category.toLowerCase());
  }

  // Get human-readable permission name
  static getPermissionName(permissionId: string): string {
    return PERMISSIONS[permissionId]?.name || permissionId;
  }

  // Get permission description
  static getPermissionDescription(permissionId: string): string {
    return PERMISSIONS[permissionId]?.description || '';
  }
}

// Permission validation helpers
export const PermissionValidators = {
  // Validate organization access
  validateOrganizationAccess: (userPermissions: UserPermissions, organizationId: string): boolean => {
    return userPermissions.organizationId === organizationId;
  },

  // Validate team access
  validateTeamAccess: (userPermissions: UserPermissions, teamId: string): boolean => {
    // Owners and admins can access all teams
    if (['owner', 'admin'].includes(userPermissions.roleId)) {
      return true;
    }
    // Check if user is member of the specific team
    return teamId in userPermissions.teamPermissions;
  },

  // Validate user can manage another user
  validateUserManagement: (managerPermissions: UserPermissions, targetRoleId: string): boolean => {
    return PermissionChecker.hasPermission(managerPermissions, 'members.manage') &&
           PermissionChecker.canManageRole(managerPermissions.roleId, targetRoleId);
  },

  // Validate content access based on visibility
  validateContentAccess: (
    userPermissions: UserPermissions,
    contentVisibility: 'private' | 'team' | 'organization' | 'public',
    contentTeamId?: string,
    contentOwnerId?: string
  ): boolean => {
    // Public content is always accessible
    if (contentVisibility === 'public') {
      return true;
    }

    // Must have content view permission
    if (!PermissionChecker.hasPermission(userPermissions, 'content.view')) {
      return false;
    }

    // Private content - only owner or users with content.manage
    if (contentVisibility === 'private') {
      return contentOwnerId === userPermissions.userId ||
             PermissionChecker.hasPermission(userPermissions, 'content.manage');
    }

    // Team content - must be team member or have content.manage
    if (contentVisibility === 'team' && contentTeamId) {
      return PermissionValidators.validateTeamAccess(userPermissions, contentTeamId) ||
             PermissionChecker.hasPermission(userPermissions, 'content.manage');
    }

    // Organization content - must be organization member
    return contentVisibility === 'organization';
  }
};