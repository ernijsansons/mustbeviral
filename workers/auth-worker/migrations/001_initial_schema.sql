-- Auth Worker Database Schema
-- Dedicated schema for authentication microservice

-- Users table (auth-specific fields only)
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    email TEXT UNIQUE NOT NULL,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT,
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'creator', 'influencer', 'admin', 'superadmin')),
    email_verified INTEGER DEFAULT 0 CHECK (email_verified IN (0, 1)),
    mfa_enabled INTEGER DEFAULT 0 CHECK (mfa_enabled IN (0, 1)),
    mfa_secret TEXT,
    account_status TEXT DEFAULT 'active' CHECK (account_status IN ('active', 'suspended', 'deleted', 'pending')),
    last_login_at TEXT,
    last_login_ip TEXT,
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- OAuth accounts linking
CREATE TABLE IF NOT EXISTS oauth_accounts (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    user_id TEXT NOT NULL,
    provider TEXT NOT NULL CHECK (provider IN ('google', 'github', 'facebook', 'twitter')),
    provider_user_id TEXT NOT NULL,
    access_token TEXT,
    refresh_token TEXT,
    token_expires_at TEXT,
    profile_data TEXT, -- JSON
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(provider, provider_user_id)
);

-- Sessions table
CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    user_id TEXT NOT NULL,
    session_token TEXT UNIQUE NOT NULL,
    refresh_token TEXT UNIQUE NOT NULL,
    user_agent TEXT,
    ip_address TEXT,
    device_fingerprint TEXT,
    expires_at TEXT NOT NULL,
    last_activity_at TEXT DEFAULT CURRENT_TIMESTAMP,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Password reset tokens
CREATE TABLE IF NOT EXISTS password_resets (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    user_id TEXT NOT NULL,
    token TEXT UNIQUE NOT NULL,
    expires_at TEXT NOT NULL,
    used INTEGER DEFAULT 0 CHECK (used IN (0, 1)),
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Email verification tokens
CREATE TABLE IF NOT EXISTS email_verifications (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    user_id TEXT NOT NULL,
    token TEXT UNIQUE NOT NULL,
    email TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    verified INTEGER DEFAULT 0 CHECK (verified IN (0, 1)),
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- MFA backup codes
CREATE TABLE IF NOT EXISTS mfa_backup_codes (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    user_id TEXT NOT NULL,
    code TEXT NOT NULL,
    used INTEGER DEFAULT 0 CHECK (used IN (0, 1)),
    used_at TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Audit log for security events
CREATE TABLE IF NOT EXISTS auth_audit_log (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    user_id TEXT,
    event_type TEXT NOT NULL,
    event_details TEXT, -- JSON
    ip_address TEXT,
    user_agent TEXT,
    status TEXT CHECK (status IN ('success', 'failure', 'warning')),
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Blacklisted tokens
CREATE TABLE IF NOT EXISTS token_blacklist (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    token TEXT UNIQUE NOT NULL,
    user_id TEXT,
    reason TEXT,
    expires_at TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- API keys for service-to-service auth
CREATE TABLE IF NOT EXISTS api_keys (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    key_hash TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    service TEXT NOT NULL,
    permissions TEXT, -- JSON array of permissions
    last_used_at TEXT,
    expires_at TEXT,
    active INTEGER DEFAULT 1 CHECK (active IN (0, 1)),
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_account_status ON users(account_status);
CREATE INDEX idx_oauth_accounts_user_id ON oauth_accounts(user_id);
CREATE INDEX idx_oauth_accounts_provider ON oauth_accounts(provider, provider_user_id);
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_token ON sessions(session_token);
CREATE INDEX idx_sessions_refresh ON sessions(refresh_token);
CREATE INDEX idx_sessions_expires ON sessions(expires_at);
CREATE INDEX idx_password_resets_user_id ON password_resets(user_id);
CREATE INDEX idx_password_resets_token ON password_resets(token);
CREATE INDEX idx_email_verifications_user_id ON email_verifications(user_id);
CREATE INDEX idx_email_verifications_token ON email_verifications(token);
CREATE INDEX idx_mfa_backup_codes_user_id ON mfa_backup_codes(user_id);
CREATE INDEX idx_auth_audit_log_user_id ON auth_audit_log(user_id);
CREATE INDEX idx_auth_audit_log_event_type ON auth_audit_log(event_type);
CREATE INDEX idx_auth_audit_log_created_at ON auth_audit_log(created_at DESC);
CREATE INDEX idx_token_blacklist_token ON token_blacklist(token);
CREATE INDEX idx_token_blacklist_expires ON token_blacklist(expires_at);
CREATE INDEX idx_api_keys_key_hash ON api_keys(key_hash);
CREATE INDEX idx_api_keys_service ON api_keys(service);

-- Triggers for updated_at
CREATE TRIGGER update_users_timestamp
AFTER UPDATE ON users
BEGIN
    UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER update_oauth_accounts_timestamp
AFTER UPDATE ON oauth_accounts
BEGIN
    UPDATE oauth_accounts SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER update_api_keys_timestamp
AFTER UPDATE ON api_keys
BEGIN
    UPDATE api_keys SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;