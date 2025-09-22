// Organization Controller
// Handles multi-tenant organization management and team operations

import { DatabaseService } from '../lib/db';
import { _OrganizationService, CreateOrganizationRequest, InviteUserRequest, UpdateMemberRequest } from '../lib/organizations/organizationService';
import { RBACService } from '../lib/rbac/rbacService';
import { _RBACMiddleware, createRBACResponse } from '../middleware/rbacMiddleware';
import { IsolatedRequest } from '../middleware/dataIsolation';
import { logger } from '../lib/logging/productionLogger';

export interface OrganizationEnv {
  DB: unknown;
  SMTP_SERVICE?: unknown; // For sending invitation emails
  FRONTEND_URL?: string;
}

export class OrganizationController {
  private organizationService: OrganizationService;
  private dbService: DatabaseService;
  private rbacService: RBACService;
  private rbacMiddleware: RBACMiddleware;

  constructor(env: OrganizationEnv) {
    this.dbService = new DatabaseService(env);
    this.organizationService = new OrganizationService(this.dbService);
    this.rbacService = new RBACService(this.dbService);
    this.rbacMiddleware = new RBACMiddleware(this.rbacService);
  }

  // Organization management endpoints
  async createOrganization(request: IsolatedRequest): Promise<Response> {
    // RBAC: Only authenticated users can create organizations
    if (!request.tenantContext) {
      return createRBACResponse(false, 'Authentication required', 401);
    }
    try {
      const body = await request.json() as CreateOrganizationRequest;

      // Validate request
      const validation = this.validateCreateOrganizationRequest(body);
      if (!validation.valid) {
        return new Response(JSON.stringify({
          error: 'Validation failed',
          details: validation.errors
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const organization = await this.organizationService.createOrganization(body);

      // Log organization creation
      await this.organizationService.logActivity(
        organization.id,
        body.ownerUserId,
        'organization.created',
        `Organization "${organization.name}" was created`,
        { organizationSlug: organization.slug }
      );

      return new Response(JSON.stringify({
        success: true,
        data: organization
      }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error: unknown) {
      return this.handleError(error, 'Failed to create organization');
    }
  }

  async getOrganization(request: IsolatedRequest, orgId?: string): Promise<Response> {
    // RBAC: Check organization view permission
    const hasPermission = await this.rbacMiddleware.requireOrganizationPermission('view')(request);
    if (!hasPermission) {
      return createRBACResponse(false, 'Insufficient permissions to view organization');
    }
    try {
      // Use orgId from route params if provided, otherwise check query params
      let organizationId = orgId;
      let orgSlug: string | null = null;

      if (!organizationId) {
        const url = new URL(request.url);
        organizationId = url.searchParams.get('id');
        orgSlug = url.searchParams.get('slug');
      }

      if (!organizationId && !orgSlug) {
        return new Response(JSON.stringify({
          error: 'Organization ID or slug is required'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const organization = organizationId
        ? await this.organizationService.getOrganizationById(organizationId)
        : await this.organizationService.getOrganizationBySlug(orgSlug!);

      if (!organization) {
        return new Response(JSON.stringify({
          error: 'Organization not found'
        }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify({
        success: true,
        data: organization
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error: unknown) {
      return this.handleError(error, 'Failed to get organization');
    }
  }

  async updateOrganization(request: Request, orgId?: string): Promise<Response> {
    try {
      // Use orgId from route params if provided, otherwise check query params
      let organizationId = orgId;
      if (!organizationId) {
        const url = new URL(request.url);
        organizationId = url.searchParams.get('id');
      }

      const body = await request.json();

      if (!organizationId) {
        return new Response(JSON.stringify({
          error: 'Organization ID is required'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Get current user from request context (would be set by auth middleware)
      const currentUserId = (request as unknown).user?.id;
      if (!currentUserId) {
        return new Response(JSON.stringify({
          error: 'Authentication required'
        }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Check if user has permission to update organization
      const hasPermission = await this.organizationService.checkUserPermission(
        organizationId,
        currentUserId,
        'organization.update'
      );

      if (!hasPermission) {
        return new Response(JSON.stringify({
          error: 'Insufficient permissions'
        }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const organization = await this.organizationService.updateOrganization(organizationId, body);

      // Log organization update
      await this.organizationService.logActivity(
        organizationId,
        currentUserId,
        'organization.updated',
        'Organization settings were updated',
        { updatedFields: Object.keys(body) }
      );

      return new Response(JSON.stringify({
        success: true,
        data: organization
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error: unknown) {
      return this.handleError(error, 'Failed to update organization');
    }
  }

  async deleteOrganization(request: Request, orgId?: string): Promise<Response> {
    try {
      const url = new URL(request.url);
      const orgId = url.searchParams.get('id');

      if (!orgId) {
        return new Response(JSON.stringify({
          error: 'Organization ID is required'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const currentUserId = (request as unknown).user?.id;
      const member = await this.organizationService.getOrganizationMember(orgId, currentUserId);

      if (!member || member.role !== 'owner') {
        return new Response(JSON.stringify({
          error: 'Only organization owners can delete organizations'
        }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      await this.organizationService.deleteOrganization(orgId);

      // Log organization deletion
      await this.organizationService.logActivity(
        orgId,
        currentUserId,
        'organization.deleted',
        'Organization was deleted',
        { severity: 'critical' }
      );

      return new Response(JSON.stringify({
        success: true,
        message: 'Organization deleted successfully'
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error: unknown) {
      return this.handleError(error, 'Failed to delete organization');
    }
  }

  // Member management endpoints
  async getOrganizationMembers(request: Request, orgId?: string): Promise<Response> {
    try {
      const url = new URL(request.url);
      const orgId = url.searchParams.get('orgId');

      if (!orgId) {
        return new Response(JSON.stringify({
          error: 'Organization ID is required'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const currentUserId = (request as unknown).user?.id;
      const hasPermission = await this.organizationService.checkUserPermission(
        orgId,
        currentUserId,
        'members.read'
      );

      if (!hasPermission) {
        return new Response(JSON.stringify({
          error: 'Insufficient permissions'
        }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const members = await this.organizationService.getOrganizationMembers(orgId);

      return new Response(JSON.stringify({
        success: true,
        data: members
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error: unknown) {
      return this.handleError(error, 'Failed to get organization members');
    }
  }

  async inviteUser(request: Request, orgId?: string): Promise<Response> {
    try {
      const body = await request.json() as InviteUserRequest;

      // Validate request
      const validation = this.validateInviteUserRequest(body);
      if (!validation.valid) {
        return new Response(JSON.stringify({
          error: 'Validation failed',
          details: validation.errors
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const currentUserId = (request as unknown).user?.id;
      const hasPermission = await this.organizationService.checkUserPermission(
        body.organizationId,
        currentUserId,
        'members.invite'
      );

      if (!hasPermission) {
        return new Response(JSON.stringify({
          error: 'Insufficient permissions to invite users'
        }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      body.invitedBy = currentUserId;
      const invitation = await this.organizationService.inviteUser(body);

      // Send invitation email (if SMTP service available)
      await this.sendInvitationEmail(invitation, body.organizationId);

      // Log invitation
      await this.organizationService.logActivity(
        body.organizationId,
        currentUserId,
        'member.invited',
        `User ${body.email} was invited to join the organization`,
        { email: body.email, role: body.role }
      );

      return new Response(JSON.stringify({
        success: true,
        data: {
          invitationId: invitation.id,
          email: invitation.email,
          role: invitation.role,
          expiresAt: invitation.expiresAt
        }
      }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error: unknown) {
      return this.handleError(error, 'Failed to invite user');
    }
  }

  async acceptInvitation(request: Request, token?: string): Promise<Response> {
    try {
      const body = await request.json() as { token: string };

      if (!body.token) {
        return new Response(JSON.stringify({
          error: 'Invitation token is required'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const currentUserId = (request as unknown).user?.id;
      if (!currentUserId) {
        return new Response(JSON.stringify({
          error: 'Authentication required'
        }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const member = await this.organizationService.acceptInvitation(body.token, currentUserId);

      // Log invitation acceptance
      await this.organizationService.logActivity(
        member.organizationId,
        currentUserId,
        'member.joined',
        'User accepted invitation and joined the organization',
        { role: member.role }
      );

      return new Response(JSON.stringify({
        success: true,
        data: member
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error: unknown) {
      return this.handleError(error, 'Failed to accept invitation');
    }
  }

  async updateMember(request: Request, orgId?: string, userId?: string): Promise<Response> {
    try {
      const url = new URL(request.url);
      const orgId = url.searchParams.get('orgId');
      const userId = url.searchParams.get('userId');
      const body = await request.json() as UpdateMemberRequest;

      if (!orgId || !userId) {
        return new Response(JSON.stringify({
          error: 'Organization ID and User ID are required'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const currentUserId = (request as unknown).user?.id;
      const hasPermission = await this.organizationService.checkUserPermission(
        orgId,
        currentUserId,
        'members.update'
      );

      if (!hasPermission) {
        return new Response(JSON.stringify({
          error: 'Insufficient permissions'
        }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const member = await this.organizationService.updateOrganizationMember(orgId, userId, body);

      // Log member update
      await this.organizationService.logActivity(
        orgId,
        currentUserId,
        'member.updated',
        `Member ${userId} was updated`,
        { _userId, updates: Object.keys(body) }
      );

      return new Response(JSON.stringify({
        success: true,
        data: member
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error: unknown) {
      return this.handleError(error, 'Failed to update member');
    }
  }

  async removeMember(request: Request, orgId?: string, userId?: string): Promise<Response> {
    try {
      const url = new URL(request.url);
      const orgId = url.searchParams.get('orgId');
      const userId = url.searchParams.get('userId');

      if (!orgId || !userId) {
        return new Response(JSON.stringify({
          error: 'Organization ID and User ID are required'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const currentUserId = (request as unknown).user?.id;
      const hasPermission = await this.organizationService.checkUserPermission(
        orgId,
        currentUserId,
        'members.remove'
      );

      if (!hasPermission) {
        return new Response(JSON.stringify({
          error: 'Insufficient permissions'
        }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      await this.organizationService.removeOrganizationMember(orgId, userId);

      // Log member removal
      await this.organizationService.logActivity(
        orgId,
        currentUserId,
        'member.removed',
        `Member ${userId} was removed from the organization`,
        { _userId, severity: 'medium' }
      );

      return new Response(JSON.stringify({
        success: true,
        message: 'Member removed successfully'
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error: unknown) {
      return this.handleError(error, 'Failed to remove member');
    }
  }

  // Team management endpoints
  async getOrganizationTeams(request: Request, orgId?: string): Promise<Response> {
    try {
      const url = new URL(request.url);
      const orgId = url.searchParams.get('orgId');

      if (!orgId) {
        return new Response(JSON.stringify({
          error: 'Organization ID is required'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const currentUserId = (request as unknown).user?.id;
      const hasPermission = await this.organizationService.checkUserPermission(
        orgId,
        currentUserId,
        'teams.read'
      );

      if (!hasPermission) {
        return new Response(JSON.stringify({
          error: 'Insufficient permissions'
        }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const teams = await this.organizationService.getOrganizationTeams(orgId);

      return new Response(JSON.stringify({
        success: true,
        data: teams
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error: unknown) {
      return this.handleError(error, 'Failed to get organization teams');
    }
  }

  async createTeam(request: Request, orgId?: string): Promise<Response> {
    try {
      const body = await request.json();

      const validation = this.validateCreateTeamRequest(body);
      if (!validation.valid) {
        return new Response(JSON.stringify({
          error: 'Validation failed',
          details: validation.errors
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const currentUserId = (request as unknown).user?.id;
      const hasPermission = await this.organizationService.checkUserPermission(
        body.organizationId,
        currentUserId,
        'teams.create'
      );

      if (!hasPermission) {
        return new Response(JSON.stringify({
          error: 'Insufficient permissions'
        }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      body.createdBy = currentUserId;
      const team = await this.organizationService.createTeam(body);

      // Log team creation
      await this.organizationService.logActivity(
        body.organizationId,
        currentUserId,
        'team.created',
        `Team "${team.name}" was created`,
        { teamId: team.id, teamName: team.name }
      );

      return new Response(JSON.stringify({
        success: true,
        data: team
      }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error: unknown) {
      return this.handleError(error, 'Failed to create team');
    }
  }

  // Usage and analytics endpoints
  async getUsageStats(request: Request, orgId?: string): Promise<Response> {
    try {
      const url = new URL(request.url);
      const orgId = url.searchParams.get('orgId');
      const period = url.searchParams.get('period');

      if (!orgId) {
        return new Response(JSON.stringify({
          error: 'Organization ID is required'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const currentUserId = (request as unknown).user?.id;
      const hasPermission = await this.organizationService.checkUserPermission(
        orgId,
        currentUserId,
        'analytics.read'
      );

      if (!hasPermission) {
        return new Response(JSON.stringify({
          error: 'Insufficient permissions'
        }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const stats = await this.organizationService.getUsageStats(orgId, period || undefined);

      return new Response(JSON.stringify({
        success: true,
        data: stats
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error: unknown) {
      return this.handleError(error, 'Failed to get usage stats');
    }
  }

  async getUserOrganizations(request: Request): Promise<Response> {
    try {
      const currentUserId = (request as unknown).user?.id;
      if (!currentUserId) {
        return new Response(JSON.stringify({
          error: 'Authentication required'
        }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const organizations = await this.organizationService.getUserOrganizations(currentUserId);

      return new Response(JSON.stringify({
        success: true,
        data: organizations
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error: unknown) {
      return this.handleError(error, 'Failed to get user organizations');
    }
  }

  async getOrganizationActivity(request: Request, orgId?: string): Promise<Response> {
    try {
      // Use orgId from route params if provided, otherwise check query params
      let organizationId = orgId;
      if (!organizationId) {
        const url = new URL(request.url);
        organizationId = url.searchParams.get('orgId');
      }

      if (!organizationId) {
        return new Response(JSON.stringify({
          error: 'Organization ID is required'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Get current user from request context
      const currentUserId = (request as unknown).user?.id;
      if (!currentUserId) {
        return new Response(JSON.stringify({
          error: 'Authentication required'
        }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Check if user has permission to view organization activity
      const hasPermission = await this.organizationService.checkUserPermission(
        organizationId,
        currentUserId,
        'organization.activity.read'
      );

      if (!hasPermission) {
        return new Response(JSON.stringify({
          error: 'Insufficient permissions'
        }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const url = new URL(request.url);
      const limit = parseInt(url.searchParams.get('limit') || '50');
      const offset = parseInt(url.searchParams.get('offset') || '0');
      const action = url.searchParams.get('action');
      const severity = url.searchParams.get('severity');

      const activity = await this.organizationService.getOrganizationActivity(
        organizationId,
        { _limit, offset, action, severity }
      );

      return new Response(JSON.stringify({
        success: true,
        data: activity
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error: unknown) {
      return this.handleError(error, 'Failed to get organization activity');
    }
  }

  // Validation methods
  private validateCreateOrganizationRequest(request: CreateOrganizationRequest): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!request.name || request.name.trim().length === 0) {
      errors.push('Organization name is required');
    }

    if (!request.slug || request.slug.trim().length === 0) {
      errors.push('Organization slug is required');
    } else if (!/^[a-z0-9-]+$/.test(request.slug)) {
      errors.push('Organization slug must contain only lowercase letters, numbers, and hyphens');
    }

    if (!request.ownerUserId) {
      errors.push('Owner user ID is required');
    }

    if (request.websiteUrl && !this.isValidUrl(request.websiteUrl)) {
      errors.push('Invalid website URL');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  private validateInviteUserRequest(request: InviteUserRequest): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!request.organizationId) {
      errors.push('Organization ID is required');
    }

    if (!request.email || !this.isValidEmail(request.email)) {
      errors.push('Valid email address is required');
    }

    if (!request.role) {
      errors.push('Role is required');
    } else if (!['owner', 'admin', 'manager', 'editor', 'member', 'viewer'].includes(request.role)) {
      errors.push('Invalid role');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  private validateCreateTeamRequest(request: unknown): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!request.organizationId) {
      errors.push('Organization ID is required');
    }

    if (!request.name || request.name.trim().length === 0) {
      errors.push('Team name is required');
    }

    if (request.color && !/^#[0-9A-F]{6}$/i.test(request.color)) {
      errors.push('Invalid color format (must be hex color)');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  private async sendInvitationEmail(invitation: unknown, organizationId: string): Promise<void> {
    // Placeholder for email sending logic
    // In production, this would integrate with an email service
    logger.info('Sending invitation email', {
      component: 'OrganizationController',
      action: 'sendInvitationEmail',
      metadata: {
        email: invitation.email,
        organizationId
      }
    });
  }

  private handleError(error: unknown, defaultMessage: string): Response {
    const errorMessage = error instanceof Error ? error.message : defaultMessage;

    logger.error('Organization Controller Error', error instanceof Error ? error : new Error(String(error)), {
      component: 'OrganizationController',
      action: 'handleError',
      metadata: { defaultMessage }
    });

    return new Response(JSON.stringify({
      success: false,
      error: errorMessage,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}