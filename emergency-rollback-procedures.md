# 🚨 Emergency Rollback Procedures - Must Be Viral V2

**Document Version:** 1.0
**Last Updated:** September 27, 2025
**Severity Level:** CRITICAL - PRODUCTION EMERGENCY

---

## 🔥 IMMEDIATE EMERGENCY CONTACT

**🚨 IF PRODUCTION IS DOWN - EXECUTE IMMEDIATELY**

### ⚡ Quick Rollback (< 2 minutes)
```bash
# Navigate to project directory
cd /path/to/must-be-viral-v2

# Execute emergency rollback
cd mustbeviral && node scripts/rollback.js rollback production

# Verify rollback status
./scripts/validate-deployment.sh production
```

---

## 📋 Emergency Response Checklist

### ⏰ IMMEDIATE (0-5 minutes)
- [ ] **Execute automatic rollback** (should trigger automatically on failure)
- [ ] **Verify rollback completion** using health checks
- [ ] **Check user access** to critical application functions
- [ ] **Notify emergency response team**
- [ ] **Begin incident logging**

### ⏰ SHORT TERM (5-30 minutes)
- [ ] **Validate all services operational** after rollback
- [ ] **Check database integrity** and data consistency
- [ ] **Verify payment processing** (if applicable)
- [ ] **Monitor error rates** and performance metrics
- [ ] **Communicate status** to stakeholders

### ⏰ MEDIUM TERM (30-120 minutes)
- [ ] **Generate incident report** with full deployment logs
- [ ] **Analyze root cause** of deployment failure
- [ ] **Plan corrective action** for next deployment attempt
- [ ] **Update deployment procedures** if needed
- [ ] **Schedule post-incident review**

---

## 🔄 Automated Rollback Triggers

### ✅ Pipeline-Triggered Rollback
The CI/CD pipeline automatically triggers rollback on:
- Build or deployment failures
- Health check failures post-deployment
- Security gate failures
- Performance degradation detection

### ✅ Manual Rollback Triggers
Immediately execute manual rollback if:
- Application becomes unresponsive
- Database connection failures
- Payment processing failures
- Security incidents detected
- Critical errors in production logs

---

## 🛠️ Detailed Rollback Procedures

### 1️⃣ Application Rollback
```bash
# Navigate to project directory
cd /path/to/must-be-viral-v2/mustbeviral

# Execute application rollback
node scripts/rollback.js rollback production

# Verify rollback
curl -f https://mustbeviral.com/health
```

**Expected Output:**
```json
{
  "status": "healthy",
  "version": "previous-stable-version",
  "timestamp": "2025-09-27T15:30:00Z"
}
```

### 2️⃣ Database Rollback
```bash
# Database rollback with backup restoration
./database/scripts/migrate.sh production rollback

# Validate database integrity
./database/scripts/validate.sql

# Test database connectivity
psql "$DATABASE_URL" -c "SELECT 1;"
```

### 3️⃣ Cloudflare Workers Rollback
```bash
# Rollback all workers to previous version
cd mustbeviral/workers/auth-worker
wrangler rollback --env production

cd ../content-worker
wrangler rollback --env production

cd ../analytics-worker
wrangler rollback --env production

cd ../api-gateway
wrangler rollback --env production

cd ../websocket-worker
wrangler rollback --env production
```

### 4️⃣ Cloudflare Pages Rollback
```bash
# Rollback Pages deployment
cd mustbeviral
wrangler pages deployment list --project-name must-be-viral-production
wrangler pages deployment rollback <deployment-id> --project-name must-be-viral-production
```

### 5️⃣ DNS Failover (If Required)
```bash
# Only if DNS changes are needed for rollback
# Update DNS records to point to previous stable deployment
# This should be rare as Cloudflare handles most routing internally
```

---

## 🔍 Rollback Validation Procedures

### ✅ Immediate Validation (< 2 minutes)
```bash
# Basic health check
curl -f https://mustbeviral.com/health

# API gateway health
curl -f https://api.mustbeviral.com/health

# Critical services
curl -f https://auth.mustbeviral.com/health
curl -f https://content.mustbeviral.com/health
```

### ✅ Comprehensive Validation (2-10 minutes)
```bash
# Run full deployment validation
./scripts/validate-deployment.sh production

# Test critical user flows
# - User registration/login
# - Content creation
# - Payment processing (if applicable)
# - Data retrieval and display
```

### ✅ Database Validation
```bash
# Check database connectivity
psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM users;"

# Verify data integrity
./database/scripts/validate.sql

# Check recent transactions
psql "$DATABASE_URL" -c "SELECT * FROM audit_log ORDER BY created_at DESC LIMIT 10;"
```

---

## 📊 Monitoring During Rollback

### 🔍 Key Metrics to Monitor
1. **Response Times:** < 2 seconds for critical endpoints
2. **Error Rates:** < 1% error rate across all services
3. **Database Performance:** Query times < 100ms average
4. **User Sessions:** Ensure existing sessions remain valid
5. **Payment Processing:** 0 failed payment transactions

### 🎛️ Monitoring Dashboards
- **Grafana:** https://your-domain.com/grafana/
- **Cloudflare Analytics:** Cloudflare dashboard
- **Application Logs:** Centralized logging system
- **Database Metrics:** PostgreSQL monitoring
- **Error Tracking:** Sentry dashboard

---

## 🚨 Incident Response Contacts

### 📞 Emergency Escalation Chain
1. **Primary On-Call Engineer:** [Contact Information]
2. **Secondary On-Call Engineer:** [Contact Information]
3. **Engineering Manager:** [Contact Information]
4. **CTO/Technical Lead:** [Contact Information]

### 📧 Notification Channels
- **Slack Channel:** #production-incidents
- **Email Distribution:** production-alerts@mustbeviral.com
- **SMS Alerts:** Configured via PagerDuty/similar

---

## 📝 Incident Documentation Template

### 🗂️ Immediate Incident Report
```
PRODUCTION INCIDENT REPORT
==========================
Incident ID: [AUTO-GENERATED]
Time: [TIMESTAMP]
Severity: [CRITICAL/HIGH/MEDIUM/LOW]
Status: [INVESTIGATING/MITIGATING/RESOLVED]

SUMMARY:
- What went wrong: [Brief description]
- Impact: [User-facing impact description]
- Rollback status: [COMPLETED/IN-PROGRESS/FAILED]

TIMELINE:
- [TIME] Issue detected
- [TIME] Rollback initiated
- [TIME] Rollback completed
- [TIME] Service restored

CURRENT STATUS:
- Application: [HEALTHY/DEGRADED/DOWN]
- Database: [HEALTHY/DEGRADED/DOWN]
- External Services: [HEALTHY/DEGRADED/DOWN]

NEXT STEPS:
- [ ] Complete service validation
- [ ] Root cause analysis
- [ ] Communication to stakeholders
```

---

## 🔄 Rollback Recovery Procedures

### ✅ After Successful Rollback
1. **Validate All Systems Operational**
   ```bash
   ./scripts/validate-deployment.sh production
   ```

2. **Monitor Performance Metrics**
   - Check response times
   - Verify error rates
   - Monitor database performance

3. **Test Critical User Flows**
   - User authentication
   - Core application features
   - Payment processing
   - Data access and modification

4. **Generate Incident Report**
   - Document what went wrong
   - Timeline of events
   - Rollback actions taken
   - Current system status

### ❌ If Rollback Fails
1. **Escalate Immediately**
   - Contact secondary on-call engineer
   - Engage engineering manager
   - Consider external support

2. **Manual Recovery Procedures**
   ```bash
   # Stop all services
   docker-compose down

   # Restore from backup
   # [Specific backup restoration procedures]

   # Restart services with previous configuration
   # [Manual service restart procedures]
   ```

3. **Last Resort Procedures**
   - DNS failover to maintenance page
   - Database restoration from backup
   - Manual service configuration
   - Emergency communication to users

---

## 🧪 Rollback Testing Procedures

### 🔄 Regular Rollback Drills
**Frequency:** Monthly
**Duration:** 30-60 minutes

**Procedure:**
1. Deploy test change to staging
2. Execute rollback procedures
3. Validate rollback completion
4. Document any issues found
5. Update procedures as needed

### 🎯 Rollback Scenarios to Test
- Application deployment failures
- Database migration failures
- Worker service failures
- Network connectivity issues
- Third-party service outages

---

## 📚 Additional Resources

### 📖 Documentation Links
- **Deployment Guide:** `DEPLOYMENT-READY-SUMMARY.md`
- **Architecture Overview:** `README.md`
- **Security Procedures:** `docs/secrets-management-guide.md`
- **Database Schema:** `database/schema/`

### 🛠️ Useful Commands
```bash
# Check application version
curl https://mustbeviral.com/api/version

# View recent logs
tail -f /var/log/mustbeviral/application.log

# Database connection test
pg_isready -h localhost -p 5432

# Worker status check
wrangler status --env production

# DNS propagation check
dig mustbeviral.com
```

---

## ⚠️ Important Notes

### 🔒 Security Considerations
- All rollback procedures maintain security standards
- No sensitive data should be exposed during rollback
- Audit all rollback actions for compliance
- Verify SSL certificates remain valid

### 📊 Performance Expectations
- **Rollback Time:** < 5 minutes for automatic rollback
- **Service Restoration:** < 10 minutes total downtime
- **Full Validation:** < 30 minutes for complete verification

### 💾 Data Integrity
- All rollbacks preserve data integrity
- No data loss during rollback procedures
- Transaction consistency maintained
- Backup verification before rollback execution

---

*This document should be reviewed and updated after each incident or significant infrastructure change.*

**Document Maintained By:** DevOps/SRE Team
**Review Schedule:** Quarterly
**Last Drill:** [Date of last rollback drill]
**Next Drill:** [Date of next scheduled drill]