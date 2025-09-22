-- Multi-Tenancy: Organizations and Team Management
-- Enables the platform to support multiple organizations with data isolation

-- Organizations table
CREATE TABLE IF NOT EXISTS organizations (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    industry TEXT,
    company_size TEXT CHECK (company_size IN ('startup', 'small', 'medium', 'large', 'enterprise')),
    website_url TEXT,
    logo_url TEXT,
    primary_color TEXT,
    secondary_color TEXT,
    timezone TEXT DEFAULT 'UTC',
    country TEXT,
    language TEXT DEFAULT 'en',

    -- Subscription and billing
    plan_type TEXT NOT NULL DEFAULT 'free' CHECK (plan_type IN ('free', 'starter', 'professional', 'enterprise', 'custom')),
    billing_email TEXT,
    stripe_customer_id TEXT,
    subscription_status TEXT DEFAULT 'active' CHECK (subscription_status IN ('active', 'past_due', 'canceled', 'unpaid', 'incomplete')),
    trial_ends_at TEXT,
    subscription_ends_at TEXT,

    -- Features and limits
    max_users INTEGER DEFAULT 5,
    max_content_items INTEGER DEFAULT 100,
    max_storage_gb INTEGER DEFAULT 5,
    ai_credits_monthly INTEGER DEFAULT 1000,
    api_requests_monthly INTEGER DEFAULT 10000,
    custom_branding INTEGER DEFAULT 0 CHECK (custom_branding IN (0, 1)),
    advanced_analytics INTEGER DEFAULT 0 CHECK (advanced_analytics IN (0, 1)),
    sso_enabled INTEGER DEFAULT 0 CHECK (sso_enabled IN (0, 1)),

    -- Status and metadata
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'pending', 'deleted')),
    settings TEXT DEFAULT '{}', -- JSON object for org settings
    metadata TEXT DEFAULT '{}', -- JSON object for additional data

    -- Audit fields
    created_by TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    deleted_at TEXT,

    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Organization members (users belonging to organizations)
CREATE TABLE IF NOT EXISTS organization_members (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    organization_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'manager', 'editor', 'member', 'viewer')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending', 'suspended')),
    permissions TEXT DEFAULT '[]', -- JSON array of specific permissions

    -- Invitation and onboarding
    invited_by TEXT,
    invited_at TEXT,
    accepted_at TEXT,
    last_activity_at TEXT,

    -- Department and team organization
    department TEXT,
    job_title TEXT,
    team_id TEXT, -- References teams table

    -- Settings
    notification_preferences TEXT DEFAULT '{}', -- JSON object
    access_restrictions TEXT DEFAULT '{}', -- JSON object for IP restrictions, time limits, etc.

    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (invited_by) REFERENCES users(id),
    UNIQUE(organization_id, user_id)
);

-- Teams within organizations
CREATE TABLE IF NOT EXISTS teams (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    organization_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    color TEXT DEFAULT '#6366f1',

    -- Team settings
    is_default INTEGER DEFAULT 0 CHECK (is_default IN (0, 1)),
    max_members INTEGER,
    permissions TEXT DEFAULT '[]', -- JSON array of team permissions
    settings TEXT DEFAULT '{}', -- JSON object for team settings

    -- Management
    created_by TEXT NOT NULL,
    manager_id TEXT, -- Team manager

    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id),
    FOREIGN KEY (manager_id) REFERENCES users(id),
    UNIQUE(organization_id, name)
);

-- Organization invitations
CREATE TABLE IF NOT EXISTS organization_invitations (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    organization_id TEXT NOT NULL,
    email TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'member',
    permissions TEXT DEFAULT '[]',
    team_id TEXT,

    -- Invitation details
    invited_by TEXT NOT NULL,
    invitation_token TEXT UNIQUE NOT NULL,
    message TEXT,
    expires_at TEXT NOT NULL,

    -- Status tracking
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
    accepted_by TEXT,
    accepted_at TEXT,
    revoked_at TEXT,

    created_at TEXT DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (invited_by) REFERENCES users(id),
    FOREIGN KEY (accepted_by) REFERENCES users(id),
    FOREIGN KEY (team_id) REFERENCES teams(id),
    UNIQUE(organization_id, email)
);

-- Organization usage tracking
CREATE TABLE IF NOT EXISTS organization_usage (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    organization_id TEXT NOT NULL,
    period_start TEXT NOT NULL,
    period_end TEXT NOT NULL,

    -- Usage metrics
    active_users INTEGER DEFAULT 0,
    content_items_created INTEGER DEFAULT 0,
    storage_used_gb REAL DEFAULT 0.0,
    ai_credits_used INTEGER DEFAULT 0,
    api_requests_made INTEGER DEFAULT 0,
    bandwidth_used_gb REAL DEFAULT 0.0,

    -- Feature usage
    advanced_analytics_views INTEGER DEFAULT 0,
    export_operations INTEGER DEFAULT 0,
    collaboration_sessions INTEGER DEFAULT 0,

    -- Costs and billing
    total_cost_cents INTEGER DEFAULT 0,
    overage_charges_cents INTEGER DEFAULT 0,

    recorded_at TEXT DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    UNIQUE(organization_id, period_start)
);

-- Content ownership and sharing within organizations
CREATE TABLE IF NOT EXISTS organization_content (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    organization_id TEXT NOT NULL,
    content_id TEXT NOT NULL,
    content_type TEXT NOT NULL, -- 'post', 'template', 'asset', etc.

    -- Ownership and permissions
    owner_id TEXT NOT NULL,
    team_id TEXT,
    visibility TEXT NOT NULL DEFAULT 'organization' CHECK (visibility IN ('private', 'team', 'organization', 'public')),
    sharing_permissions TEXT DEFAULT '{}', -- JSON object

    -- Organization-specific metadata
    category TEXT,
    tags TEXT DEFAULT '[]', -- JSON array
    approval_status TEXT DEFAULT 'approved' CHECK (approval_status IN ('draft', 'pending', 'approved', 'rejected')),
    approved_by TEXT,
    approved_at TEXT,

    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (owner_id) REFERENCES users(id),
    FOREIGN KEY (team_id) REFERENCES teams(id),
    FOREIGN KEY (approved_by) REFERENCES users(id),
    UNIQUE(organization_id, content_id)
);

-- Organization-level configurations and branding
CREATE TABLE IF NOT EXISTS organization_branding (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    organization_id TEXT NOT NULL UNIQUE,

    -- Brand assets
    logo_light_url TEXT,
    logo_dark_url TEXT,
    logo_mark_url TEXT,
    favicon_url TEXT,

    -- Color scheme
    primary_color TEXT DEFAULT '#6366f1',
    secondary_color TEXT DEFAULT '#8b5cf6',
    accent_color TEXT DEFAULT '#06b6d4',
    background_color TEXT DEFAULT '#ffffff',
    text_color TEXT DEFAULT '#1f2937',

    -- Typography
    font_family TEXT DEFAULT 'Inter',
    heading_font TEXT,

    -- Custom CSS and styling
    custom_css TEXT,
    email_template_html TEXT,

    -- Domain and white-labeling
    custom_domain TEXT,
    subdomain TEXT,
    white_label_enabled INTEGER DEFAULT 0 CHECK (white_label_enabled IN (0, 1)),

    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

-- Organization activity log
CREATE TABLE IF NOT EXISTS organization_activity (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    organization_id TEXT NOT NULL,
    user_id TEXT,
    action TEXT NOT NULL,
    resource_type TEXT, -- 'user', 'content', 'team', 'settings', etc.
    resource_id TEXT,

    -- Activity details
    description TEXT NOT NULL,
    metadata TEXT DEFAULT '{}', -- JSON object with additional details
    ip_address TEXT,
    user_agent TEXT,

    -- Impact and severity
    severity TEXT DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'error', 'critical')),
    impact_level TEXT DEFAULT 'low' CHECK (impact_level IN ('low', 'medium', 'high')),

    created_at TEXT DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Add organization_id to existing users table (modify existing structure)
ALTER TABLE users ADD COLUMN organization_id TEXT REFERENCES organizations(id);
ALTER TABLE users ADD COLUMN is_organization_owner INTEGER DEFAULT 0 CHECK (is_organization_owner IN (0, 1));

-- Update posts table to include organization context
ALTER TABLE posts ADD COLUMN organization_id TEXT REFERENCES organizations(id);
ALTER TABLE posts ADD COLUMN team_id TEXT REFERENCES teams(id);
ALTER TABLE posts ADD COLUMN visibility TEXT DEFAULT 'public' CHECK (visibility IN ('private', 'team', 'organization', 'public'));

-- Indexes for performance
CREATE INDEX idx_organizations_slug ON organizations(slug);
CREATE INDEX idx_organizations_status ON organizations(status);
CREATE INDEX idx_organizations_plan_type ON organizations(plan_type);
CREATE INDEX idx_organizations_created_at ON organizations(created_at);

CREATE INDEX idx_organization_members_org_id ON organization_members(organization_id);
CREATE INDEX idx_organization_members_user_id ON organization_members(user_id);
CREATE INDEX idx_organization_members_role ON organization_members(role);
CREATE INDEX idx_organization_members_status ON organization_members(status);

CREATE INDEX idx_teams_organization_id ON teams(organization_id);
CREATE INDEX idx_teams_manager_id ON teams(manager_id);

CREATE INDEX idx_organization_invitations_org_id ON organization_invitations(organization_id);
CREATE INDEX idx_organization_invitations_email ON organization_invitations(email);
CREATE INDEX idx_organization_invitations_token ON organization_invitations(invitation_token);
CREATE INDEX idx_organization_invitations_status ON organization_invitations(status);
CREATE INDEX idx_organization_invitations_expires_at ON organization_invitations(expires_at);

CREATE INDEX idx_organization_usage_org_id ON organization_usage(organization_id);
CREATE INDEX idx_organization_usage_period ON organization_usage(period_start, period_end);

CREATE INDEX idx_organization_content_org_id ON organization_content(organization_id);
CREATE INDEX idx_organization_content_owner_id ON organization_content(owner_id);
CREATE INDEX idx_organization_content_team_id ON organization_content(team_id);
CREATE INDEX idx_organization_content_visibility ON organization_content(visibility);

CREATE INDEX idx_organization_activity_org_id ON organization_activity(organization_id);
CREATE INDEX idx_organization_activity_user_id ON organization_activity(user_id);
CREATE INDEX idx_organization_activity_action ON organization_activity(action);
CREATE INDEX idx_organization_activity_created_at ON organization_activity(created_at DESC);

CREATE INDEX idx_users_organization_id ON users(organization_id);
CREATE INDEX idx_posts_organization_id ON posts(organization_id);
CREATE INDEX idx_posts_team_id ON posts(team_id);

-- Triggers for updated_at timestamps
CREATE TRIGGER update_organizations_timestamp
AFTER UPDATE ON organizations
BEGIN
    UPDATE organizations SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER update_organization_members_timestamp
AFTER UPDATE ON organization_members
BEGIN
    UPDATE organization_members SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER update_teams_timestamp
AFTER UPDATE ON teams
BEGIN
    UPDATE teams SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER update_organization_content_timestamp
AFTER UPDATE ON organization_content
BEGIN
    UPDATE organization_content SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER update_organization_branding_timestamp
AFTER UPDATE ON organization_branding
BEGIN
    UPDATE organization_branding SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Data integrity constraints and business rules
CREATE TRIGGER enforce_organization_owner_limit
BEFORE INSERT ON organization_members
WHEN NEW.role = 'owner'
BEGIN
    SELECT CASE
        WHEN (SELECT COUNT(*) FROM organization_members
              WHERE organization_id = NEW.organization_id AND role = 'owner') >= 1
        THEN RAISE(ABORT, 'Organization can have only one owner')
    END;
END;

CREATE TRIGGER prevent_self_invitation
BEFORE INSERT ON organization_invitations
WHEN NEW.email IN (SELECT email FROM users WHERE id = NEW.invited_by)
BEGIN
    SELECT RAISE(ABORT, 'Cannot invite yourself to organization');
END;

-- Insert default data for single-tenant upgrade
INSERT OR IGNORE INTO organizations (
    id, name, slug, description, plan_type, status, created_by, created_at
) VALUES (
    'default-org-001',
    'Default Organization',
    'default',
    'Default organization for existing users',
    'professional',
    'active',
    (SELECT id FROM users LIMIT 1),
    CURRENT_TIMESTAMP
);

-- Migrate existing users to default organization
UPDATE users
SET organization_id = 'default-org-001',
    is_organization_owner = CASE WHEN id = (SELECT id FROM users LIMIT 1) THEN 1 ELSE 0 END
WHERE organization_id IS NULL;

-- Create default organization members
INSERT OR IGNORE INTO organization_members (organization_id, user_id, role, status, accepted_at)
SELECT 'default-org-001', id,
       CASE WHEN is_organization_owner = 1 THEN 'owner' ELSE 'member' END,
       'active',
       CURRENT_TIMESTAMP
FROM users
WHERE organization_id = 'default-org-001';

-- Update existing posts with organization context
UPDATE posts
SET organization_id = 'default-org-001', visibility = 'organization'
WHERE organization_id IS NULL;