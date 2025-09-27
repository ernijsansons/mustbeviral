#!/bin/bash

# Generate Development SSL Certificates for Must Be Viral V2
# WARNING: Only use for development/testing - NOT for production

set -e

CERT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DAYS=365
KEYSIZE=2048

echo "🔐 Generating development SSL certificates..."
echo "📂 Certificate directory: $CERT_DIR"

# Configuration for the certificate
COUNTRY="US"
STATE="California"
CITY="San Francisco"
ORG="Must Be Viral Development"
OU="Development Team"
COMMON_NAME="localhost"
EMAIL="dev@mustbeviral.com"

# Subject for the certificate
SUBJECT="/C=$COUNTRY/ST=$STATE/L=$CITY/O=$ORG/OU=$OU/CN=$COMMON_NAME/emailAddress=$EMAIL"

# Create Subject Alternative Names for development
SAN_CONFIG="[req]
distinguished_name = req_distinguished_name
req_extensions = v3_req
prompt = no

[req_distinguished_name]
C=$COUNTRY
ST=$STATE
L=$CITY
O=$ORG
OU=$OU
CN=$COMMON_NAME
emailAddress=$EMAIL

[v3_req]
basicConstraints = CA:FALSE
keyUsage = nonRepudiation, digitalSignature, keyEncipherment
subjectAltName = @alt_names

[alt_names]
DNS.1 = localhost
DNS.2 = *.localhost
DNS.3 = mustbeviral.local
DNS.4 = *.mustbeviral.local
DNS.5 = 127.0.0.1
DNS.6 = ::1
IP.1 = 127.0.0.1
IP.2 = ::1"

# Write the config to a temporary file
CONFIG_FILE="$CERT_DIR/dev-cert.conf"
echo "$SAN_CONFIG" > "$CONFIG_FILE"

echo "🔑 Generating private key..."
openssl genrsa -out "$CERT_DIR/dev-key.pem" $KEYSIZE

echo "📜 Generating certificate signing request..."
openssl req -new \
    -key "$CERT_DIR/dev-key.pem" \
    -out "$CERT_DIR/dev-cert.csr" \
    -config "$CONFIG_FILE"

echo "📄 Generating self-signed certificate..."
openssl x509 -req \
    -in "$CERT_DIR/dev-cert.csr" \
    -signkey "$CERT_DIR/dev-key.pem" \
    -out "$CERT_DIR/dev-cert.pem" \
    -days $DAYS \
    -extensions v3_req \
    -extfile "$CONFIG_FILE"

# Create symlinks for nginx
echo "🔗 Creating symlinks for nginx..."
ln -sf dev-cert.pem "$CERT_DIR/cert.pem"
ln -sf dev-key.pem "$CERT_DIR/key.pem"

# Set proper permissions
echo "🔒 Setting proper permissions..."
chmod 644 "$CERT_DIR/dev-cert.pem" "$CERT_DIR/cert.pem"
chmod 600 "$CERT_DIR/dev-key.pem" "$CERT_DIR/key.pem"

# Clean up temporary files
rm -f "$CERT_DIR/dev-cert.csr" "$CONFIG_FILE"

echo "✅ Development SSL certificates generated successfully!"
echo ""
echo "📋 Certificate Information:"
openssl x509 -in "$CERT_DIR/dev-cert.pem" -text -noout | grep -A 1 "Subject:"
openssl x509 -in "$CERT_DIR/dev-cert.pem" -text -noout | grep -A 3 "Subject Alternative Name"
echo ""
echo "📅 Certificate Valid:"
openssl x509 -in "$CERT_DIR/dev-cert.pem" -noout -dates
echo ""
echo "⚠️  WARNING: This is a self-signed certificate for development only!"
echo "   For production, obtain certificates from a trusted CA or use Let's Encrypt."
echo ""
echo "💡 To trust this certificate in your browser:"
echo "   - Chrome/Edge: Go to chrome://settings/certificates"
echo "   - Firefox: Go to about:preferences#privacy"
echo "   - macOS: Add to Keychain Access"
echo "   - Linux: Add to /usr/local/share/ca-certificates/"

# Verify the certificate
echo ""
echo "🔍 Verifying certificate..."
if openssl verify -CAfile "$CERT_DIR/dev-cert.pem" "$CERT_DIR/dev-cert.pem" 2>/dev/null | grep -q "OK"; then
    echo "✅ Certificate verification: PASSED"
else
    echo "⚠️  Certificate verification: Self-signed (expected for development)"
fi

# Test nginx configuration if available
if command -v nginx >/dev/null 2>&1; then
    echo ""
    echo "🧪 Testing nginx configuration..."
    if nginx -t 2>/dev/null; then
        echo "✅ Nginx configuration: VALID"
    else
        echo "⚠️  Nginx configuration: Please check nginx.conf"
    fi
fi

echo ""
echo "🚀 Ready for development HTTPS on https://localhost"