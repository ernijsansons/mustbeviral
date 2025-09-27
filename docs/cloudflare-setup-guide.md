# Cloudflare Setup Guide for Must Be Viral V2

This guide provides step-by-step instructions to set up all required Cloudflare resources for deployment.

## Prerequisites

- Active Cloudflare account
- Wrangler CLI installed (`npm install -g wrangler`)
- Domain registered and using Cloudflare nameservers

## 1. Authentication Setup

```bash
# Login to Cloudflare
wrangler login

# Verify authentication
wrangler whoami

# Get your account ID (save this for environment variables)
wrangler accounts list
```

## 2. Create Required Databases

### D1 Databases
```bash
# Create main application database
wrangler d1 create mustbeviral-db

# Create analytics database
wrangler d1 create mustbeviral-analytics

# Create user management database
wrangler d1 create mustbeviral-users

# List databases to get IDs
wrangler d1 list
```

## 3. Create KV Namespaces

```bash
# Create session storage namespace
wrangler kv:namespace create "SESSION_STORE"

# Create cache namespace
wrangler kv:namespace create "CACHE_STORE"

# Create rate limiting namespace
wrangler kv:namespace create "RATE_LIMIT_STORE"

# Create configuration namespace
wrangler kv:namespace create "CONFIG_STORE"

# List namespaces to get IDs
wrangler kv:namespace list
```

## 4. Create R2 Storage Buckets

```bash
# Create main assets bucket
wrangler r2 bucket create mustbeviral-assets

# Create user uploads bucket
wrangler r2 bucket create mustbeviral-uploads

# Create backups bucket
wrangler r2 bucket create mustbeviral-backups

# List buckets to verify
wrangler r2 bucket list
```

## 5. Generate API Tokens

1. Go to [Cloudflare Dashboard > My Profile > API Tokens](https://dash.cloudflare.com/profile/api-tokens)
2. Click "Create Token"
3. Use "Custom token" template
4. Configure permissions:
   - Zone:Zone Settings:Edit
   - Zone:Zone:Read
   - Account:Cloudflare Workers:Edit
   - Account:Account Settings:Read
   - Account:D1:Edit
   - Zone:Page Rules:Edit

## 6. Update Wrangler Configuration Files

After creating resources, update the wrangler.toml files with actual IDs:

### Auth Worker
```bash
cd mustbeviral/workers/auth-worker
# Edit wrangler.toml and replace placeholders with actual IDs
```

### Content Worker
```bash
cd mustbeviral/workers/content-worker
# Edit wrangler.toml and replace placeholders with actual IDs
```

### Analytics Worker
```bash
cd mustbeviral/workers/analytics-worker
# Edit wrangler.toml and replace placeholders with actual IDs
```

### API Gateway
```bash
cd mustbeviral/workers/api-gateway
# Edit wrangler.toml and replace placeholders with actual IDs
```

### WebSocket Worker
```bash
cd mustbeviral/workers/websocket-worker
# Edit wrangler.toml and replace placeholders with actual IDs
```

## 7. Environment Variables Setup

Update your environment files with the resource IDs:

```bash
# .env.production
CLOUDFLARE_ACCOUNT_ID=your_account_id_here
CLOUDFLARE_API_TOKEN=your_api_token_here

# D1 Database IDs
D1_DATABASE_ID=your_main_db_id
D1_ANALYTICS_DATABASE_ID=your_analytics_db_id
D1_USERS_DATABASE_ID=your_users_db_id

# KV Namespace IDs
KV_SESSION_NAMESPACE_ID=your_session_kv_id
KV_CACHE_NAMESPACE_ID=your_cache_kv_id
KV_RATE_LIMIT_NAMESPACE_ID=your_rate_limit_kv_id
KV_CONFIG_NAMESPACE_ID=your_config_kv_id

# R2 Bucket Names
R2_ASSETS_BUCKET=mustbeviral-assets
R2_UPLOADS_BUCKET=mustbeviral-uploads
R2_BACKUPS_BUCKET=mustbeviral-backups
```

## 8. Database Migrations

```bash
# Run initial migrations for each database
wrangler d1 execute mustbeviral-db --remote --file=./database/migrations/001_initial_schema.sql
wrangler d1 execute mustbeviral-analytics --remote --file=./database/migrations/002_analytics_schema.sql
wrangler d1 execute mustbeviral-users --remote --file=./database/migrations/003_users_schema.sql
```

## 9. Deploy Workers

```bash
# Deploy all workers
cd mustbeviral/workers/auth-worker && wrangler deploy --env production
cd ../content-worker && wrangler deploy --env production
cd ../analytics-worker && wrangler deploy --env production
cd ../api-gateway && wrangler deploy --env production
cd ../websocket-worker && wrangler deploy --env production
```

## 10. DNS Configuration

Set up DNS records for your domain:

```bash
# Main application (CNAME or A record)
mustbeviral.com -> your-cloudflare-pages-url

# API subdomain
api.mustbeviral.com -> your-api-gateway-worker-url

# Assets subdomain
assets.mustbeviral.com -> your-r2-bucket-url

# WebSocket subdomain
ws.mustbeviral.com -> your-websocket-worker-url
```

## 11. Pages Deployment

```bash
# Connect GitHub repository to Cloudflare Pages
# Build command: npm run build
# Build output directory: mustbeviral/dist
# Environment variables: Add all production environment variables

# Or deploy directly
wrangler pages deploy mustbeviral/dist --project-name=mustbeviral
```

## 12. Security Configuration

### Security Headers
Configure security headers in Cloudflare Dashboard:
- Go to Security > Settings
- Enable Browser Integrity Check
- Set Security Level to Medium or High
- Configure Page Rules for security headers

### WAF Rules
Set up Web Application Firewall rules:
- Rate limiting for API endpoints
- Bot protection for forms
- DDoS protection settings

## 13. Performance Optimization

### Caching Rules
```bash
# Set up caching rules in Cloudflare Dashboard
# Static assets: Cache everything for 1 year
# API responses: Cache for 5 minutes with stale-while-revalidate
# HTML pages: Cache for 1 hour
```

### Compression
- Enable Brotli compression
- Enable Gzip compression
- Minify CSS, JavaScript, and HTML

## 14. Monitoring Setup

### Analytics
- Enable Cloudflare Analytics
- Set up custom events tracking
- Configure error tracking

### Alerts
Set up alerts for:
- High error rates
- Unusual traffic patterns
- Resource usage thresholds
- Worker script errors

## 15. Verification Commands

```bash
# Test worker deployments
curl https://auth-worker.your-account.workers.dev/health
curl https://content-worker.your-account.workers.dev/health
curl https://analytics-worker.your-account.workers.dev/health
curl https://api-gateway.your-account.workers.dev/health
curl https://websocket-worker.your-account.workers.dev/health

# Test D1 databases
wrangler d1 execute mustbeviral-db --remote --command="SELECT 1"

# Test KV namespaces
wrangler kv:key put --namespace-id=YOUR_NAMESPACE_ID "test" "value"
wrangler kv:key get --namespace-id=YOUR_NAMESPACE_ID "test"

# Test R2 buckets
echo "test" | wrangler r2 object put mustbeviral-assets/test.txt
wrangler r2 object get mustbeviral-assets/test.txt
```

## 16. Backup and Disaster Recovery

```bash
# Set up automated D1 backups
wrangler d1 backup create mustbeviral-db

# Export current data for backup
wrangler d1 execute mustbeviral-db --remote --command="SELECT * FROM users" --output=json > backup-users.json

# Set up R2 bucket versioning
wrangler r2 bucket update mustbeviral-assets --versioning=Enabled
```

## Cost Optimization Tips

1. **Monitor Usage**: Set up billing alerts
2. **Optimize Workers**: Minimize execution time and memory usage
3. **Cache Strategy**: Implement effective caching to reduce origin requests
4. **Resource Cleanup**: Regularly clean up unused resources
5. **Review Metrics**: Monitor and optimize based on usage patterns

## Troubleshooting

### Common Issues

**Authentication Errors**
```bash
# Clear and re-authenticate
wrangler logout
wrangler login
```

**Deployment Failures**
```bash
# Check worker logs
wrangler tail your-worker-name

# Validate wrangler.toml
wrangler config
```

**Database Connection Issues**
```bash
# Test D1 connection
wrangler d1 execute your-db-name --remote --command="SELECT 1"

# Check database bindings in wrangler.toml
```

**KV Access Issues**
```bash
# Verify namespace exists
wrangler kv:namespace list

# Test KV access
wrangler kv:key list --namespace-id=YOUR_NAMESPACE_ID
```

## Support and Documentation

- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [Cloudflare D1 Documentation](https://developers.cloudflare.com/d1/)
- [Cloudflare R2 Documentation](https://developers.cloudflare.com/r2/)
- [Wrangler CLI Documentation](https://developers.cloudflare.com/workers/wrangler/)

## Next Steps

After completing this setup:

1. Run the deployment validation script: `./scripts/validate-deployment.sh production`
2. Test all application functionality
3. Set up monitoring and alerting
4. Configure backup procedures
5. Document custom configurations for your team

---

**Note**: Replace all placeholder values (your_*, mustbeviral.com, etc.) with your actual values during setup.