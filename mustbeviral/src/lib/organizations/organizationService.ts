// Organization Service
// Handles multi-tenant organization management and data isolation

import { DatabaseService} from '../db';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  description?: string;
  industry?: string;
  companySize?: 'startup' | 'small' | 'medium' | 'large' | 'enterprise';
  websiteUrl?: string;
  logoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  timezone: string;
  country?: string;
  language: string;
  planType: 'free' | 'starter' | 'professional' | 'enterprise' | 'custom';
  billingEmail?: string;
  stripeCustomerId?: string;
  subscriptionStatus: 'active' | 'past_due' | 'canceled' | 'unpaid' | 'incomplete';
  trialEndsAt?: string;
  subscriptionEndsAt?: string;
  maxUsers: number;
  maxContentItems: number;
  maxStorageGb: number;
  aiCreditsMonthly: number;
  apiRequestsMonthly: number;
  customBranding: boolean;
  advancedAnalytics: boolean;
  ssoEnabled: boolean;
  status: 'active' | 'suspended' | 'pending' | 'deleted';
  settings: Record<string, unknown>;
  metadata: Record<string, unknown>;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export interface OrganizationMember {
  id: string;
  organizationId: string;
  userId: string;
  role: 'owner' | 'admin' | 'manager' | 'editor' | 'member' | 'viewer';
  status: 'active' | 'inactive' | 'pending' | 'suspended';
  permissions: string[];
  invitedBy?: string;
  invitedAt?: string;
  acceptedAt?: string;
  lastActivityAt?: string;
  department?: string;
  jobTitle?: string;
  teamId?: string;
  notificationPreferences: Record<string, unknown>;
  accessRestrictions: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface Team {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  color: string;
  isDefault: boolean;
  maxMembers?: number;
  permissions: string[];
  settings: Record<string, unknown>;
  createdBy: string;
  managerId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationInvitation {
  id: string;
  organizationId: string;
  email: string;
  role: string;
  permissions: string[];
  teamId?: string;
  invitedBy: string;
  invitationToken: string;
  message?: string;
  expiresAt: string;
  status: 'pending' | 'accepted' | 'expired' | 'revoked';
  acceptedBy?: string;
  acceptedAt?: string;
  revokedAt?: string;
  createdAt: string;
}

export interface CreateOrganizationRequest {
  name: string;
  slug: string;
  description?: string;
  industry?: string;
  companySize?: string;
  websiteUrl?: string;
  planType?: string;
  ownerUserId: string;
}

export interface InviteUserRequest {
  organizationId: string;
  email: string;
  role: string;
  permissions?: string[];
  teamId?: string;
  message?: string;
  invitedBy: string;
}

export interface UpdateMemberRequest {
  role?: string;
  permissions?: string[];
  teamId?: string;
  department?: string;
  jobTitle?: string;
  status?: string;
}

export class OrganizationService {
  constructor(private db: DatabaseService) {}

  // Organization management
  async createOrganization(request: CreateOrganizationRequest): Promise<Organization> {
    const organizationId = crypto.randomUUID();

    // Check if slug is unique
    const existingOrg = await this.getOrganizationBySlug(request.slug);
    if (existingOrg) {
      throw new Error('Organization slug already exists');
    }

    // Create organization
    const organization: Partial<Organization> = {
      id: organizationId,
      name: request.name,
      slug: request.slug,
      description: request.description,
      industry: request.industry,
      companySize: request.companySize as unknown,
      websiteUrl: request.websiteUrl,
      planType: (request.planType as unknown)  ?? 'free',
      timezone: 'UTC',
      language: 'en',
      subscriptionStatus: 'active',
      maxUsers: 5,
      maxContentItems: 100,
      maxStorageGb: 5,
      aiCreditsMonthly: 1000,
      apiRequestsMonthly: 10000,
      customBranding: false,
      advancedAnalytics: false,
      ssoEnabled: false,
      status: 'active',
      settings: {},
      metadata: {},
      createdBy: request.ownerUserId
    };

    await this.db.executeQuery(`
      INSERT INTO organizations (
        id, name, slug, description, industry, companysize, websiteurl,
        plantype, timezone, language, subscriptionstatus, maxusers,
        maxcontentitems, maxstoragegb, aicreditsmonthly, apirequestsmonthly,
        custombranding, advancedanalytics, ssoenabled, status, settings,
        metadata, createdby
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
      )
    `, [
      organizationId,
      organization.name,
      organization.slug,
      organization.description,
      organization.industry,
      organization.companySize,
      organization.websiteUrl,
      organization.planType,
      organization.timezone,
      organization.language,
      organization.subscriptionStatus,
      organization.maxUsers,
      organization.maxContentItems,
      organization.maxStorageGb,
      organization.aiCreditsMonthly,
      organization.apiRequestsMonthly,
      organization.customBranding ? 1 : 0,
      organization.advancedAnalytics ? 1 : 0,
      organization.ssoEnabled ? 1 : 0,
      organization.status,
      JSON.stringify(organization.settings),
      JSON.stringify(organization.metadata),
      organization.createdBy
    ]);

    // Add owner as organization member
    await this.addOrganizationMember(organizationId, request.ownerUserId, 'owner');

    // Update user's organization
    await this.db.executeQuery(`
      UPDATE users
      SET organizationid = ?, isorganizationowner = 1
      WHERE id = ?
    `, [organizationId, request.ownerUserId]);

    // Create default team
    await this.createTeam({ organizationId,
      name: 'General',
      description: 'Default team for all members',
      isDefault: true,
      createdBy: request.ownerUserId
    });

    return this.getOrganizationById(organizationId)!;
  }

  async getOrganizationById(id: string): Promise<Organization | null> {
    const result = await this.db.fetchOne<unknown>(`
      SELECT * FROM organizations WHERE id = ? AND deleted_at IS NULL
    `, [id]);

    return result ? this.mapOrganizationFromDb(result) : null;
  }

  async getOrganizationBySlug(slug: string): Promise<Organization | null> {
    const result = await this.db.fetchOne<unknown>(`
      SELECT * FROM organizations WHERE slug = ? AND deleted_at IS NULL
    `, [slug]);

    return result ? this.mapOrganizationFromDb(result) : null;
  }

  async updateOrganization(id: string, updates: Partial<Organization>): Promise<Organization> {
    const setClause = [];
    const params = [];

    if (updates.name) {
      setClause.push('name = ?');
      params.push(updates.name);
    }

    if (updates.description !== undefined) {
      setClause.push('description = ?');
      params.push(updates.description);
    }

    if (updates.industry) {
      setClause.push('industry = ?');
      params.push(updates.industry);
    }

    if (updates.websiteUrl !== undefined) {
      setClause.push('websiteurl = ?');
      params.push(updates.websiteUrl);
    }

    if (updates.logoUrl !== undefined) {
      setClause.push('logourl = ?');
      params.push(updates.logoUrl);
    }

    if (updates.settings) {
      setClause.push('settings = ?');
      params.push(JSON.stringify(updates.settings));
    }

    if (setClause.length === 0) {
      throw new Error('No updates provided');
    }

    params.push(id);

    await this.db.executeQuery(`
      UPDATE organizations
      SET ${setClause.join(', ')}, updatedat = CURRENT_TIMESTAMP
      WHERE id = ?
    `, params);

    return this.getOrganizationById(id)!;
  }

  async deleteOrganization(id: string): Promise<void> {
    await this.db.executeQuery(`
      UPDATE organizations
      SET status = 'deleted', deletedat = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [id]);
  }

  // Member management
  async addOrganizationMember(
    organizationId: string,
    userId: string,
    role: string,
    permissions: string[] = []
  ): Promise<OrganizationMember> {
    const memberId = crypto.randomUUID();

    await this.db.executeQuery(`
      INSERT INTO organizationmembers(
        id, organizationid, userid, role, status, permissions, acceptedat
      ) VALUES (?, ?, ?, ?, 'active', ?, CURRENTTIMESTAMP)
    `, [
      memberId,
      organizationId,
      userId,
      role,
      JSON.stringify(permissions)
    ]);

    // Update user's organization if not set
    await this.db.executeQuery(`
      UPDATE users
      SET organizationid = COALESCE(organizationid, ?)
      WHERE id = ?
    `, [organizationId, userId]);

    return this.getOrganizationMember(organizationId, userId)!;
  }

  async getOrganizationMember(organizationId: string, userId: string): Promise<OrganizationMember | null> {
    const result = await this.db.fetchOne<unknown>(`
      SELECT * FROM organization_members
      WHERE organizationid = ? AND userid = ?
    `, [organizationId, userId]);

    return result ? this.mapMemberFromDb(result) : null;
  }

  async getOrganizationMembers(organizationId: string): Promise<OrganizationMember[]> {
    const results = await this.db.fetchAll<unknown>(`
      SELECT om.*, u.email, u.username, u.firstname, u.last_name
      FROM organization_members om
      JOIN users u ON om.userid = u.id
      WHERE om.organizationid = ?
      ORDER BY om.role, u.firstname, u.last_name
    `, [organizationId]);

    return results.map(result => this.mapMemberFromDb(result));
  }

  async updateOrganizationMember(
    organizationId: string,
    userId: string,
    updates: UpdateMemberRequest
  ): Promise<OrganizationMember> {
    const setClause = [];
    const params = [];

    if (updates.role) {
      setClause.push('role = ?');
      params.push(updates.role);
    }

    if (updates.permissions) {
      setClause.push('permissions = ?');
      params.push(JSON.stringify(updates.permissions));
    }

    if (updates.teamId !== undefined) {
      setClause.push('teamid = ?');
      params.push(updates.teamId);
    }

    if (updates.department !== undefined) {
      setClause.push('department = ?');
      params.push(updates.department);
    }

    if (updates.jobTitle !== undefined) {
      setClause.push('jobtitle = ?');
      params.push(updates.jobTitle);
    }

    if (updates.status) {
      setClause.push('status = ?');
      params.push(updates.status);
    }

    if (setClause.length === 0) {
      throw new Error('No updates provided');
    }

    params.push(organizationId, userId);

    await this.db.executeQuery(`
      UPDATE organization_members
      SET ${setClause.join(', ')}, updatedat = CURRENT_TIMESTAMP
      WHERE organizationid = ? AND userid = ?
    `, params);

    return this.getOrganizationMember(organizationId, userId)!;
  }

  async removeOrganizationMember(organizationId: string, userId: string): Promise<void> {
    // Check if user is the organization owner
    const member = await this.getOrganizationMember(organizationId, userId);
    if (member?.role === 'owner') {
      throw new Error('Cannot remove organization owner');
    }

    await this.db.executeQuery(`
      DELETE FROM organization_members
      WHERE organizationid = ? AND userid = ?
    `, [organizationId, userId]);

    // Clear user's organization if this was their primary org
    await this.db.executeQuery(`
      UPDATE users
      SET organizationid = NULL, isorganizationowner = 0
      WHERE id = ? AND organizationid = ?
    `, [userId, organizationId]);
  }

  // Team management
  async createTeam(teamData: {
    organizationId: string;
    name: string;
    description?: string;
    color?: string;
    isDefault?: boolean;
    maxMembers?: number;
    permissions?: string[];
    createdBy: string;
    managerId?: string;
  }): Promise<Team> {
    const teamId = crypto.randomUUID();

    await this.db.executeQuery(`
      INSERT INTO teams (
        id, organizationid, name, description, color, isdefault,
        maxmembers, permissions, createdby, managerid
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      teamId,
      teamData.organizationId,
      teamData.name,
      teamData.description,
      teamData.color ?? '#6366f1',
      teamData.isDefault ? 1 : 0,
      teamData.maxMembers,
      JSON.stringify(teamData.permissions ?? []),
      teamData.createdBy,
      teamData.managerId
    ]);

    return this.getTeamById(teamId)!;
  }

  async getTeamById(id: string): Promise<Team | null> {
    const result = await this.db.fetchOne<unknown>(`
      SELECT * FROM teams WHERE id = ?
    `, [id]);

    return result ? this.mapTeamFromDb(result) : null;
  }

  async getOrganizationTeams(organizationId: string): Promise<Team[]> {
    const results = await this.db.fetchAll<unknown>(`
      SELECT * FROM teams WHERE organizationid = ? ORDER BY is_default DESC, name
    `, [organizationId]);

    return results.map(result => this.mapTeamFromDb(result));
  }

  // Invitation management
  async inviteUser(request: InviteUserRequest): Promise<OrganizationInvitation> {
    const invitationId = crypto.randomUUID();
    const invitationToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days

    // Check if user is already a member
    const existingUser = await this.db.fetchOne<unknown>(`
      SELECT u.id FROM users u
      JOIN organization_members om ON u.id = om.user_id
      WHERE u.email = ? AND om.organizationid = ?
    `, [request.email, request.organizationId]);

    if (existingUser) {
      throw new Error('User is already a member of this organization');
    }

    await this.db.executeQuery(`
      INSERT INTO organizationinvitations(
        id, organizationid, email, role, permissions, teamid,
        invitedby, invitationtoken, message, expiresat
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      invitationId,
      request.organizationId,
      request.email,
      request.role,
      JSON.stringify(request.permissions ?? []),
      request.teamId,
      request.invitedBy,
      invitationToken,
      request.message,
      expiresAt
    ]);

    return this.getInvitationById(invitationId)!;
  }

  async getInvitationById(id: string): Promise<OrganizationInvitation | null> {
    const result = await this.db.fetchOne<unknown>(`
      SELECT * FROM organization_invitations WHERE id = ?
    `, [id]);

    return result ? this.mapInvitationFromDb(result) : null;
  }

  async getInvitationByToken(token: string): Promise<OrganizationInvitation | null> {
    const result = await this.db.fetchOne<unknown>(`
      SELECT * FROM organization_invitations WHERE invitationtoken = ?
    `, [token]);

    return result ? this.mapInvitationFromDb(result) : null;
  }

  async acceptInvitation(token: string, userId: string): Promise<OrganizationMember> {
    const invitation = await this.getInvitationByToken(token);
    if (!invitation) {
      throw new Error('Invalid invitation token');
    }

    if (invitation.status !== 'pending') {
      throw new Error('Invitation is no longer valid');
    }

    if (new Date(invitation.expiresAt) < new Date()) {
      throw new Error('Invitation has expired');
    }

    // Add user to organization
    const member = await this.addOrganizationMember(
      invitation.organizationId,
      userId,
      invitation.role,
      invitation.permissions
    );

    // Update invitation status
    await this.db.executeQuery(`
      UPDATE organization_invitations
      SET status = 'accepted', acceptedby = ?, acceptedat = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [userId, invitation.id]);

    // Assign to team if specified
    if (invitation.teamId) {
      await this.updateOrganizationMember(invitation.organizationId, userId, {
        teamId: invitation.teamId
      });
    }

    return member;
  }

  async revokeInvitation(id: string): Promise<void> {
    await this.db.executeQuery(`
      UPDATE organization_invitations
      SET status = 'revoked', revokedat = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [id]);
  }

  // Permission and access control
  async checkUserPermission(
    organizationId: string,
    userId: string,
    permission: string
  ): Promise<boolean> {
    const member = await this.getOrganizationMember(organizationId, userId);
    if (!member) {
      return false;
    }

    // Owners and admins have all permissions
    if (member.role === 'owner'  ?? member.role === 'admin') {
      return true;
    }

    // Check specific permissions
    return member.permissions.includes(permission);
  }

  async getUserOrganizations(userId: string): Promise<Organization[]> {
    const results = await this.db.fetchAll<unknown>(`
      SELECT o.* FROM organizations o
      JOIN organization_members om ON o.id = om.organization_id
      WHERE om.userid = ? AND o.status = 'active'
      ORDER BY om.role, o.name
    `, [userId]);

    return results.map(result => this.mapOrganizationFromDb(result));
  }

  // Usage tracking
  async trackUsage(organizationId: string, metrics: {
    activeUsers?: number;
    contentItemsCreated?: number;
    storageUsedGb?: number;
    aiCreditsUsed?: number;
    apiRequestsMade?: number;
  }): Promise<void> {
    const periodStart = new Date();
    periodStart.setDate(1); // First day of month
    periodStart.setHours(0, 0, 0, 0);

    const periodEnd = new Date(periodStart);
    periodEnd.setMonth(periodEnd.getMonth() + 1);
    periodEnd.setDate(0); // Last day of month

    await this.db.executeQuery(`
      INSERT OR REPLACE INTO organizationusage(
        organizationid, periodstart, periodend,
        activeusers, contentitemscreated, storageusedgb,
        aicreditsused, apirequestsmade
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      organizationId,
      periodStart.toISOString(),
      periodEnd.toISOString(),
      metrics.activeUsers ?? 0,
      metrics.contentItemsCreated ?? 0,
      metrics.storageUsedGb ?? 0,
      metrics.aiCreditsUsed ?? 0,
      metrics.apiRequestsMade ?? 0
    ]);
  }

  async getUsageStats(organizationId: string, period?: string): Promise<unknown> {
    let whereClause = 'organizationid = ?';
    const params = [organizationId];

    if (period) {
      whereClause += ' AND period_start >= ?';
      params.push(period);
    }

    return await this.db.fetchOne(`
      SELECT
        SUM(activeusers) as totalactiveusers,
        SUM(contentitemscreated) as totalcontentitems,
        SUM(storageusedgb) as totalstoragegb,
        SUM(aicreditsused) as totalaicredits,
        SUM(apirequestsmade) as total_api_requests
      FROM organization_usage
      WHERE ${whereClause}
    `, params);
  }

  // Activity logging
  async logActivity(
    organizationId: string,
    userId: string,
    action: string,
    description: string,
    metadata: Record<string, unknown> = {}
  ): Promise<void> {
    await this.db.executeQuery(`
      INSERT INTO organizationactivity(
        organizationid, userid, action, description, metadata
      ) VALUES (?, ?, ?, ?, ?)
    `, [
      organizationId,
      userId,
      action,
      description,
      JSON.stringify(metadata)
    ]);
  }

  // Data mapping helpers
  private mapOrganizationFromDb(row: unknown): Organization {
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      description: row.description,
      industry: row.industry,
      companySize: row.companysize,
      websiteUrl: row.websiteurl,
      logoUrl: row.logourl,
      primaryColor: row.primarycolor,
      secondaryColor: row.secondarycolor,
      timezone: row.timezone,
      country: row.country,
      language: row.language,
      planType: row.plantype,
      billingEmail: row.billingemail,
      stripeCustomerId: row.stripecustomerid,
      subscriptionStatus: row.subscriptionstatus,
      trialEndsAt: row.trialendsat,
      subscriptionEndsAt: row.subscriptionendsat,
      maxUsers: row.maxusers,
      maxContentItems: row.maxcontentitems,
      maxStorageGb: row.maxstoragegb,
      aiCreditsMonthly: row.aicreditsmonthly,
      apiRequestsMonthly: row.apirequestsmonthly,
      customBranding: !!row.custombranding,
      advancedAnalytics: !!row.advancedanalytics,
      ssoEnabled: !!row.ssoenabled,
      status: row.status,
      settings: JSON.parse(row.settings ?? '{}'),
      metadata: JSON.parse(row.metadata ?? '{}'),
      createdBy: row.createdby,
      createdAt: row.createdat,
      updatedAt: row.updatedat,
      deletedAt: row.deletedat
    };
  }

  private mapMemberFromDb(row: unknown): OrganizationMember {
    return {
      id: row.id,
      organizationId: row.organizationid,
      userId: row.userid,
      role: row.role,
      status: row.status,
      permissions: JSON.parse(row.permissions ?? '[]'),
      invitedBy: row.invitedby,
      invitedAt: row.invitedat,
      acceptedAt: row.acceptedat,
      lastActivityAt: row.lastactivityat,
      department: row.department,
      jobTitle: row.jobtitle,
      teamId: row.teamid,
      notificationPreferences: JSON.parse(row.notification_preferences ?? '{}'),
      accessRestrictions: JSON.parse(row.access_restrictions ?? '{}'),
      createdAt: row.createdat,
      updatedAt: row.updatedat
    };
  }

  private mapTeamFromDb(row: unknown): Team {
    return {
      id: row.id,
      organizationId: row.organizationid,
      name: row.name,
      description: row.description,
      color: row.color,
      isDefault: !!row.isdefault,
      maxMembers: row.maxmembers,
      permissions: JSON.parse(row.permissions ?? '[]'),
      settings: JSON.parse(row.settings ?? '{}'),
      createdBy: row.createdby,
      managerId: row.managerid,
      createdAt: row.createdat,
      updatedAt: row.updatedat
    };
  }

  private mapInvitationFromDb(row: unknown): OrganizationInvitation {
    return {
      id: row.id,
      organizationId: row.organizationid,
      email: row.email,
      role: row.role,
      permissions: JSON.parse(row.permissions ?? '[]'),
      teamId: row.teamid,
      invitedBy: row.invitedby,
      invitationToken: row.invitationtoken,
      message: row.message,
      expiresAt: row.expiresat,
      status: row.status,
      acceptedBy: row.acceptedby,
      acceptedAt: row.acceptedat,
      revokedAt: row.revokedat,
      createdAt: row.createdat
    };
  }
}