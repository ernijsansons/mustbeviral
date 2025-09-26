-- User Management Schema
-- Clean architecture with proper domain modeling
-- Supports enterprise-grade user management features

-- Users table with comprehensive user information
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY NOT NULL,
    email TEXT UNIQUE NOT NULL,
    firstName TEXT NOT NULL,
    lastName TEXT NOT NULL,
    passwordHash TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('user', 'creator', 'brand_manager', 'agency', 'admin', 'super_admin')),
    status TEXT NOT NULL CHECK (status IN ('active', 'inactive', 'suspended', 'banned', 'pending_verification')) DEFAULT 'pending_verification',
    
    -- Email verification
    emailVerified INTEGER NOT NULL DEFAULT 0,
    emailVerificationToken TEXT,
    
    -- Password reset
    passwordResetToken TEXT,
    passwordResetExpires TEXT,
    
    -- Security
    lastLoginAt TEXT,
    loginAttempts INTEGER NOT NULL DEFAULT 0,
    lockedUntil TEXT,
    
    -- Preferences (JSON)
    preferences TEXT NOT NULL DEFAULT '{}',
    
    -- Subscription information (JSON)
    subscription TEXT,
    
    -- Timestamps
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
);

-- User login history for security auditing and analytics
CREATE TABLE IF NOT EXISTS user_login_history (
    id TEXT PRIMARY KEY NOT NULL,
    userId TEXT NOT NULL,
    loginAt TEXT NOT NULL,
    ipAddress TEXT,
    userAgent TEXT,
    success INTEGER NOT NULL DEFAULT 0,
    failureReason TEXT,
    sessionDuration INTEGER, -- in seconds
    
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_email_verified ON users(emailVerified);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(createdAt);
CREATE INDEX IF NOT EXISTS idx_users_last_login ON users(lastLoginAt);
CREATE INDEX IF NOT EXISTS idx_users_email_verification_token ON users(emailVerificationToken);
CREATE INDEX IF NOT EXISTS idx_users_password_reset_token ON users(passwordResetToken);

-- Login history indexes
CREATE INDEX IF NOT EXISTS idx_login_history_user_id ON user_login_history(userId);
CREATE INDEX IF NOT EXISTS idx_login_history_login_at ON user_login_history(loginAt);
CREATE INDEX IF NOT EXISTS idx_login_history_success ON user_login_history(success);
CREATE INDEX IF NOT EXISTS idx_login_history_ip ON user_login_history(ipAddress);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_users_status_role ON users(status, role);
CREATE INDEX IF NOT EXISTS idx_users_email_verified_status ON users(emailVerified, status);
CREATE INDEX IF NOT EXISTS idx_login_history_user_success_date ON user_login_history(userId, success, loginAt);

-- User sessions table for session management
CREATE TABLE IF NOT EXISTS user_sessions (
    id TEXT PRIMARY KEY NOT NULL,
    userId TEXT NOT NULL,
    tokenHash TEXT NOT NULL UNIQUE,
    refreshTokenHash TEXT UNIQUE,
    ipAddress TEXT,
    userAgent TEXT,
    createdAt TEXT NOT NULL,
    expiresAt TEXT NOT NULL,
    lastUsedAt TEXT NOT NULL,
    isRevoked INTEGER NOT NULL DEFAULT 0,
    
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);

-- Session indexes
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON user_sessions(userId);
CREATE INDEX IF NOT EXISTS idx_sessions_token_hash ON user_sessions(tokenHash);
CREATE INDEX IF NOT EXISTS idx_sessions_refresh_token ON user_sessions(refreshTokenHash);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON user_sessions(expiresAt);
CREATE INDEX IF NOT EXISTS idx_sessions_is_revoked ON user_sessions(isRevoked);

-- User permissions table for RBAC
CREATE TABLE IF NOT EXISTS user_permissions (
    id TEXT PRIMARY KEY NOT NULL,
    userId TEXT NOT NULL,
    permission TEXT NOT NULL,
    resource TEXT,
    grantedBy TEXT NOT NULL,
    grantedAt TEXT NOT NULL,
    expiresAt TEXT,
    
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (grantedBy) REFERENCES users(id),
    UNIQUE(userId, permission, resource)
);

-- Permission indexes
CREATE INDEX IF NOT EXISTS idx_permissions_user_id ON user_permissions(userId);
CREATE INDEX IF NOT EXISTS idx_permissions_permission ON user_permissions(permission);
CREATE INDEX IF NOT EXISTS idx_permissions_expires_at ON user_permissions(expiresAt);

-- User activity log for audit trail
CREATE TABLE IF NOT EXISTS user_activity_log (
    id TEXT PRIMARY KEY NOT NULL,
    userId TEXT NOT NULL,
    action TEXT NOT NULL,
    resource TEXT,
    resourceId TEXT,
    metadata TEXT, -- JSON
    ipAddress TEXT,
    userAgent TEXT,
    timestamp TEXT NOT NULL,
    
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);

-- Activity log indexes
CREATE INDEX IF NOT EXISTS idx_activity_user_id ON user_activity_log(userId);
CREATE INDEX IF NOT EXISTS idx_activity_action ON user_activity_log(action);
CREATE INDEX IF NOT EXISTS idx_activity_timestamp ON user_activity_log(timestamp);
CREATE INDEX IF NOT EXISTS idx_activity_resource ON user_activity_log(resource, resourceId);

-- Triggers for automatic timestamp updates
CREATE TRIGGER IF NOT EXISTS update_users_updated_at 
    AFTER UPDATE ON users
    BEGIN
        UPDATE users SET updatedAt = datetime('now') WHERE id = NEW.id;
    END;

-- Trigger to log user activities
CREATE TRIGGER IF NOT EXISTS log_user_profile_changes
    AFTER UPDATE ON users
    WHEN OLD.firstName != NEW.firstName 
      OR OLD.lastName != NEW.lastName 
      OR OLD.email != NEW.email
      OR OLD.role != NEW.role
      OR OLD.status != NEW.status
    BEGIN
        INSERT INTO user_activity_log (
            id, userId, action, resource, metadata, timestamp
        ) VALUES (
            lower(hex(randomblob(16))),
            NEW.id,
            'profile_updated',
            'user',
            json_object(
                'changes', json_object(
                    'firstName', json_array(OLD.firstName, NEW.firstName),
                    'lastName', json_array(OLD.lastName, NEW.lastName),
                    'email', json_array(OLD.email, NEW.email),
                    'role', json_array(OLD.role, NEW.role),
                    'status', json_array(OLD.status, NEW.status)
                )
            ),
            datetime('now')
        );
    END;

-- Views for common queries
CREATE VIEW IF NOT EXISTS v_user_summary AS
SELECT 
    u.id,
    u.email,
    u.firstName,
    u.lastName,
    u.firstName || ' ' || u.lastName as fullName,
    u.role,
    u.status,
    u.emailVerified,
    u.lastLoginAt,
    u.createdAt,
    u.updatedAt,
    CASE 
        WHEN u.subscription IS NOT NULL 
        AND json_extract(u.subscription, '$.status') = 'active'
        AND datetime(json_extract(u.subscription, '$.currentPeriodEnd')) > datetime('now')
        THEN 1 
        ELSE 0 
    END as hasActiveSubscription,
    CASE 
        WHEN u.lockedUntil IS NOT NULL 
        AND datetime(u.lockedUntil) > datetime('now')
        THEN 1 
        ELSE 0 
    END as isLocked,
    (
        SELECT COUNT(*) 
        FROM user_login_history ulh 
        WHERE ulh.userId = u.id AND ulh.success = 1
    ) as loginCount,
    (
        SELECT COUNT(*) 
        FROM user_activity_log ual 
        WHERE ual.userId = u.id
    ) as activityCount
FROM users u;

-- View for user engagement metrics
CREATE VIEW IF NOT EXISTS v_user_engagement AS
SELECT 
    u.id,
    u.email,
    u.firstName || ' ' || u.lastName as fullName,
    u.createdAt as registrationDate,
    CAST(
        (julianday('now') - julianday(u.createdAt)) AS INTEGER
    ) as daysSinceRegistration,
    CASE 
        WHEN u.lastLoginAt IS NOT NULL THEN
            CAST(
                (julianday('now') - julianday(u.lastLoginAt)) AS INTEGER
            )
        ELSE NULL 
    END as daysSinceLastLogin,
    (
        SELECT COUNT(*) 
        FROM user_login_history ulh 
        WHERE ulh.userId = u.id AND ulh.success = 1
    ) as totalLogins,
    (
        SELECT COUNT(*) 
        FROM user_login_history ulh 
        WHERE ulh.userId = u.id 
        AND ulh.success = 1 
        AND datetime(ulh.loginAt) >= datetime('now', '-30 days')
    ) as loginsLast30Days,
    (
        SELECT AVG(sessionDuration) 
        FROM user_login_history ulh 
        WHERE ulh.userId = u.id 
        AND ulh.success = 1 
        AND ulh.sessionDuration IS NOT NULL
    ) as avgSessionDuration,
    (
        SELECT COUNT(DISTINCT DATE(ulh.loginAt))
        FROM user_login_history ulh 
        WHERE ulh.userId = u.id 
        AND ulh.success = 1 
        AND datetime(ulh.loginAt) >= datetime('now', '-30 days')
    ) as activeDaysLast30
FROM users u;

-- Insert default admin user (password: TempPassword123!)
INSERT OR IGNORE INTO users (
    id, email, firstName, lastName, passwordHash, role, status, 
    emailVerified, preferences, createdAt, updatedAt
) VALUES (
    'admin-' || lower(hex(randomblob(16))),
    'admin@mustbeviral.com',
    'System',
    'Administrator',
    '$2b$12$LQv3c1yqBwEHxE/fHYHjEO/1s.1l1jq1W5E3q3c1q3c1q3c1q3c1', -- hashed password
    'super_admin',
    'active',
    1,
    json_object(
        'timezone', 'UTC',
        'language', 'en',
        'theme', 'light',
        'notifications', json_object(
            'email', json_object('enabled', true, 'campaigns', true, 'analytics', true, 'system', true, 'marketing', false),
            'push', json_object('enabled', true, 'realTime', true, 'daily', true, 'weekly', true),
            'sms', json_object('enabled', false, 'urgent', false)
        ),
        'content', json_object(
            'defaultTone', 'professional',
            'preferredPlatforms', json_array(),
            'autoOptimize', true,
            'brandVoice', 'default',
            'contentCategories', json_array()
        ),
        'privacy', json_object(
            'profileVisibility', 'private',
            'dataSharing', false,
            'analytics', true,
            'marketing', false
        )
    ),
    datetime('now'),
    datetime('now')
);