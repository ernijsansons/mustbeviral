# SSL Certificate Setup for Must Be Viral V2

## Overview
This directory contains SSL certificate configurations for production deployment.

## Required Files

### Production Certificates (must be provided)
- `cert.pem` - SSL certificate file
- `key.pem` - Private key file
- `ca-bundle.pem` - Certificate Authority bundle (optional)

### Development Certificates (auto-generated)
- `dev-cert.pem` - Development SSL certificate
- `dev-key.pem` - Development private key

## Setup Instructions

### For Production Deployment

1. **Obtain SSL Certificates**
   - Purchase from a trusted CA (DigiCert, GlobalSign, etc.)
   - Use Let's Encrypt for free certificates
   - Configure Cloudflare SSL if using Cloudflare

2. **Install Certificates**
   ```bash
   # Copy your certificates to this directory
   cp your-domain.crt ./cert.pem
   cp your-domain.key ./key.pem
   cp ca-bundle.crt ./ca-bundle.pem
   ```

3. **Set Proper Permissions**
   ```bash
   chmod 644 cert.pem ca-bundle.pem
   chmod 600 key.pem
   ```

### For Development (Auto-Generated)

Run the development certificate generation script:
```bash
./generate-dev-certs.sh
```

### For Cloudflare Deployment

When using Cloudflare:
1. Configure "Full (strict)" SSL mode in Cloudflare dashboard
2. Use Cloudflare Origin Certificates for origin server
3. Enable "Always Use HTTPS" in Cloudflare

### Certificate Validation

Test your SSL configuration:
```bash
# Test SSL certificate
openssl x509 -in cert.pem -text -noout

# Test SSL connection
openssl s_client -connect your-domain.com:443 -servername your-domain.com

# Check certificate chain
openssl verify -CAfile ca-bundle.pem cert.pem
```

## Security Notes

- Never commit private keys to version control
- Use strong encryption (RSA 2048+ or ECC P-256+)
- Enable HSTS (already configured in nginx.conf)
- Regularly update certificates before expiration
- Monitor certificate expiration dates

## Troubleshooting

### Common Issues
1. **Permission Denied**: Check file permissions (600 for keys, 644 for certs)
2. **Certificate Chain Issues**: Ensure ca-bundle.pem is properly configured
3. **Domain Mismatch**: Verify certificate matches your domain name
4. **Expired Certificate**: Check expiration dates with `openssl x509 -dates -noout -in cert.pem`

### Testing Commands
```bash
# Check certificate expiration
openssl x509 -enddate -noout -in cert.pem

# Verify private key matches certificate
openssl x509 -noout -modulus -in cert.pem | openssl md5
openssl rsa -noout -modulus -in key.pem | openssl md5

# Test SSL configuration
curl -I https://your-domain.com
```

## Automation

For automated certificate management, consider:
- Certbot for Let's Encrypt
- Cloudflare API for Cloudflare certificates
- AWS Certificate Manager for AWS deployments
- Azure Key Vault for Azure deployments