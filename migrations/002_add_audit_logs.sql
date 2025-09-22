-- Add audit logging tables for security monitoring and compliance

-- Audit logs table for comprehensive security monitoring
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  timestamp DATETIME NOT NULL,
  event_type TEXT NOT NULL,
  user_id TEXT,
  session_id TEXT,
  ip TEXT NOT NULL,
  user_agent TEXT,
  resource TEXT,
  action TEXT,
  outcome TEXT NOT NULL, -- 'success', 'failure', 'blocked'
  metadata TEXT, -- JSON metadata
  risk_level TEXT NOT NULL, -- 'low', 'medium', 'high', 'critical'
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Security incidents table for tracking major security events
CREATE TABLE IF NOT EXISTS security_incidents (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  severity TEXT NOT NULL, -- 'low', 'medium', 'high', 'critical'
  status TEXT DEFAULT 'open', -- 'open', 'investigating', 'resolved', 'false_positive'
  ip_address TEXT,
  user_id TEXT,
  first_seen DATETIME NOT NULL,
  last_seen DATETIME NOT NULL,
  event_count INTEGER DEFAULT 1,
  metadata TEXT, -- JSON metadata
  resolved_at DATETIME,
  resolved_by TEXT,
  resolution_notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- IP blacklist table for blocking malicious IPs
CREATE TABLE IF NOT EXISTS ip_blacklist (
  id TEXT PRIMARY KEY,
  ip_address TEXT UNIQUE NOT NULL,
  reason TEXT NOT NULL,
  blocked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  blocked_until DATETIME,
  blocked_by TEXT,
  incident_count INTEGER DEFAULT 1,
  last_incident DATETIME DEFAULT CURRENT_TIMESTAMP,
  metadata TEXT, -- JSON metadata
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- User activity summary for monitoring user behavior patterns
CREATE TABLE IF NOT EXISTS user_activity_summary (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  date DATE NOT NULL,
  login_count INTEGER DEFAULT 0,
  failed_login_count INTEGER DEFAULT 0,
  api_calls INTEGER DEFAULT 0,
  content_created INTEGER DEFAULT 0,
  content_updated INTEGER DEFAULT 0,
  content_deleted INTEGER DEFAULT 0,
  ai_requests INTEGER DEFAULT 0,
  last_active DATETIME,
  ip_addresses TEXT, -- JSON array of IPs used
  user_agents TEXT, -- JSON array of user agents
  suspicious_activity_count INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  UNIQUE(user_id, date)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_logs_event_type ON audit_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_ip ON audit_logs(ip);
CREATE INDEX IF NOT EXISTS idx_audit_logs_risk_level ON audit_logs(risk_level);
CREATE INDEX IF NOT EXISTS idx_audit_logs_outcome ON audit_logs(outcome);

CREATE INDEX IF NOT EXISTS idx_security_incidents_severity ON security_incidents(severity);
CREATE INDEX IF NOT EXISTS idx_security_incidents_status ON security_incidents(status);
CREATE INDEX IF NOT EXISTS idx_security_incidents_ip ON security_incidents(ip_address);
CREATE INDEX IF NOT EXISTS idx_security_incidents_user_id ON security_incidents(user_id);
CREATE INDEX IF NOT EXISTS idx_security_incidents_first_seen ON security_incidents(first_seen);

CREATE INDEX IF NOT EXISTS idx_ip_blacklist_ip ON ip_blacklist(ip_address);
CREATE INDEX IF NOT EXISTS idx_ip_blacklist_blocked_until ON ip_blacklist(blocked_until);

CREATE INDEX IF NOT EXISTS idx_user_activity_user_date ON user_activity_summary(user_id, date);
CREATE INDEX IF NOT EXISTS idx_user_activity_date ON user_activity_summary(date);
CREATE INDEX IF NOT EXISTS idx_user_activity_suspicious ON user_activity_summary(suspicious_activity_count);

-- Insert initial admin user for security management (optional)
-- INSERT INTO users (id, email, username, password_hash, role, onboarding_completed)
-- VALUES ('admin-001', 'admin@mustbeviral.com', 'admin', '[SECURE_HASH]', 'admin', 1);