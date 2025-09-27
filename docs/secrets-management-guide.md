# Secrets Management Guide for Must Be Viral V2

## Generated Secure Secrets

**IMPORTANT**: The secrets below are examples. Generate your own using the provided commands.

### Production Secrets (Base64 Encoded)

```env
# Authentication & Security
JWT_SECRET=Q+v+xzsZzswUIoKY7Z8p9gKxw44Kp9vx4osaKy+TuS0I9IScEbTgDwCgJXoGoa4jsvkOb44FVfyPqY/7RV/w+A==
ENCRYPTION_KEY=gVyOuIolRzvaythtHQVuiLJVOp4HLWCVsc5yINvT3hc=
SESSION_SECRET=tQkSpxfebvxspXiWOa8i7SoGmOFPwQ2lwX6+pgJAZe7P5nQl8zrTLV3g6Jc9DvGdK+X+x9yhyyAahc0zVFxC+w==
WEBHOOK_SECRET=gSCp/d5EEHdY+xtClRoSUrMThzzlZclwRwpvjl8Ku6M=
API_SECRET_KEY=ORkB15lSf4hS8ayBNIWnmcobXoV7S9V80pAT3b8MzdBIkQAk1IYBvQDZqhifQMklG1azj9ONuKw+BByYJKM4qg==

# Database Security
DATABASE_ENCRYPTION_KEY=JtWtsfgZ/sZHlJZsDSw19FpuK/lhSoavs5a6hCAjuK8=
REDIS_PASSWORD=Gsu1XuMfWsiPugN6uZTm0Q+zzGl0H3TyCg2kl5gxuo4=

# Third-party Integrations
STRIPE_WEBHOOK_SECRET=cIeJihfBHxmwq/6nhjXw5p0Cf7hzIHnVS5e8dpKniQo=
OAUTH_CLIENT_SECRET=eJuuahoVP9fVcfh1E6gK0N6dDhtq4Xlj4KQZgS/P0CI=

# Additional Security
CSRF_SECRET=m8qjF/wAUrFeOma2zJdErfPfYxXc75PK+SzuFi9hFmU=
COOKIE_SECRET=nZPPoL2AwLoGZxMnEK6bWnAKcE/M04KyFWVQ7yVSQcU=
RATE_LIMIT_SECRET=Mh+jLSmgUqxrFoJOuuDI75Fz4AoguQj0Xa3pFsZFuPI=
```

## Generating Your Own Secrets

### Command Line Generation

```bash
# Generate a 64-byte base64 secret
openssl rand -base64 64

# Generate a 32-byte base64 secret
openssl rand -base64 32

# Generate all secrets at once
node -e "
const crypto = require('crypto');
console.log('JWT_SECRET=' + crypto.randomBytes(64).toString('base64'));
console.log('ENCRYPTION_KEY=' + crypto.randomBytes(32).toString('base64'));
console.log('SESSION_SECRET=' + crypto.randomBytes(64).toString('base64'));
console.log('WEBHOOK_SECRET=' + crypto.randomBytes(32).toString('base64'));
console.log('API_SECRET_KEY=' + crypto.randomBytes(64).toString('base64'));
console.log('DATABASE_ENCRYPTION_KEY=' + crypto.randomBytes(32).toString('base64'));
console.log('REDIS_PASSWORD=' + crypto.randomBytes(32).toString('base64'));
console.log('STRIPE_WEBHOOK_SECRET=' + crypto.randomBytes(32).toString('base64'));
console.log('OAUTH_CLIENT_SECRET=' + crypto.randomBytes(32).toString('base64'));
console.log('CSRF_SECRET=' + crypto.randomBytes(32).toString('base64'));
console.log('COOKIE_SECRET=' + crypto.randomBytes(32).toString('base64'));
console.log('RATE_LIMIT_SECRET=' + crypto.randomBytes(32).toString('base64'));
"
```

### PowerShell Generation (Windows)

```powershell
# Generate a secure random string
[System.Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(64))

# Generate all secrets
$secrets = @(
    @{Name="JWT_SECRET"; Size=64},
    @{Name="ENCRYPTION_KEY"; Size=32},
    @{Name="SESSION_SECRET"; Size=64},
    @{Name="WEBHOOK_SECRET"; Size=32},
    @{Name="API_SECRET_KEY"; Size=64},
    @{Name="DATABASE_ENCRYPTION_KEY"; Size=32},
    @{Name="REDIS_PASSWORD"; Size=32},
    @{Name="STRIPE_WEBHOOK_SECRET"; Size=32},
    @{Name="OAUTH_CLIENT_SECRET"; Size=32},
    @{Name="CSRF_SECRET"; Size=32},
    @{Name="COOKIE_SECRET"; Size=32},
    @{Name="RATE_LIMIT_SECRET"; Size=32}
)

foreach ($secret in $secrets) {
    $value = [System.Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes($secret.Size))
    Write-Output "$($secret.Name)=$value"
}
```

## Secret Storage Best Practices

### Environment-Specific Storage

1. **Development**: Use `.env` file (add to .gitignore)
2. **Staging**: Use secure environment variable injection
3. **Production**: Use Cloudflare environment variables or external secret management

### Cloudflare Workers Secrets

```bash
# Set secrets for workers
wrangler secret put JWT_SECRET --env production
wrangler secret put ENCRYPTION_KEY --env production
wrangler secret put SESSION_SECRET --env production
wrangler secret put WEBHOOK_SECRET --env production
wrangler secret put API_SECRET_KEY --env production
wrangler secret put DATABASE_ENCRYPTION_KEY --env production

# List all secrets
wrangler secret list --env production
```

### GitHub Actions Secrets

Add these secrets to your GitHub repository:
1. Go to Settings > Secrets and variables > Actions
2. Add each secret individually:
   - `JWT_SECRET`
   - `ENCRYPTION_KEY`
   - `SESSION_SECRET`
   - `WEBHOOK_SECRET`
   - `API_SECRET_KEY`
   - `DATABASE_ENCRYPTION_KEY`
   - `CLOUDFLARE_API_TOKEN`
   - `CLOUDFLARE_ACCOUNT_ID`

## Secret Rotation Schedule

### High Priority (Monthly)
- JWT_SECRET
- API_SECRET_KEY
- WEBHOOK_SECRET

### Medium Priority (Quarterly)
- SESSION_SECRET
- ENCRYPTION_KEY
- DATABASE_ENCRYPTION_KEY

### Low Priority (Annually)
- CSRF_SECRET
- COOKIE_SECRET
- RATE_LIMIT_SECRET

## Security Guidelines

### DO
- ✅ Use cryptographically secure random generation
- ✅ Store secrets in environment variables, never in code
- ✅ Use different secrets for each environment
- ✅ Rotate secrets regularly
- ✅ Use base64 encoding for binary secrets
- ✅ Monitor secret usage and access
- ✅ Use minimal required permissions

### DON'T
- ❌ Commit secrets to version control
- ❌ Share secrets via insecure channels (email, chat)
- ❌ Use predictable or weak secrets
- ❌ Reuse secrets across different applications
- ❌ Log secrets in application logs
- ❌ Store secrets in client-side code

## Emergency Secret Rotation

If a secret is compromised:

1. **Immediate Actions**
   ```bash
   # Generate new secret
   NEW_SECRET=$(openssl rand -base64 64)

   # Update Cloudflare Workers
   wrangler secret put JWT_SECRET --env production

   # Update GitHub Actions
   # Go to repository settings and update the secret

   # Update environment files
   # Replace the compromised secret in .env.production
   ```

2. **Verification**
   ```bash
   # Test that new secret works
   curl -H "Authorization: Bearer $NEW_JWT_TOKEN" https://api.mustbeviral.com/health

   # Monitor logs for authentication failures
   wrangler tail auth-worker --env production
   ```

3. **Documentation**
   - Update this document with new secret (if template)
   - Log the rotation in security audit trail
   - Notify team members of the change

## Monitoring and Auditing

### Key Metrics to Monitor
- Failed authentication attempts
- Secret usage patterns
- Unusual access patterns
- Performance impact of encryption/decryption

### Logging Guidelines
```javascript
// Good: Log events without exposing secrets
logger.info('JWT token validation successful', { userId, action });

// Bad: Don't log the actual secret values
logger.error('JWT validation failed with token: ' + token); // DON'T DO THIS
```

## Integration with External Services

### HashiCorp Vault (Optional)
```bash
# Store secrets in Vault
vault kv put secret/mustbeviral/prod jwt_secret="$JWT_SECRET"

# Retrieve secrets
vault kv get -field=jwt_secret secret/mustbeviral/prod
```

### AWS Secrets Manager (Optional)
```bash
# Store secrets in AWS
aws secretsmanager create-secret --name mustbeviral/prod/jwt --secret-string "$JWT_SECRET"

# Retrieve secrets
aws secretsmanager get-secret-value --secret-id mustbeviral/prod/jwt --query SecretString --output text
```

## Backup and Recovery

### Secret Backup Strategy
1. Store encrypted backups of secrets in secure location
2. Use multiple team members for secret recovery (split knowledge)
3. Document recovery procedures
4. Test recovery process regularly

### Recovery Commands
```bash
# Backup current secrets (encrypted)
gpg --cipher-algo AES256 --compress-algo 1 --s2k-mode 3 --s2k-digest-algo SHA512 --s2k-count 65536 --symmetric --output secrets-backup.gpg secrets.env

# Restore from backup
gpg --decrypt secrets-backup.gpg > secrets.env
```

---

**Remember**: Treat these secrets like passwords. Never share them insecurely, and rotate them regularly for maximum security.