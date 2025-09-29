#!/bin/bash

# Secrets Setup Script for Must Be Viral V2
# Configure all required secrets for deployed workers

echo "🔐 Must Be Viral V2 - Secrets Configuration"
echo "==========================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Check for Cloudflare API token
if [ -z "$CLOUDFLARE_API_TOKEN" ]; then
    export CLOUDFLARE_API_TOKEN="Ao1ymubM-LL5DzsNkRH3FJ5TJxItddFo8_RZEbsE"
fi

# Function to set secret
set_secret() {
    local worker_name=$1
    local secret_name=$2
    local secret_value=$3

    echo -e "${YELLOW}Setting ${secret_name} for ${worker_name}...${NC}"
    echo "$secret_value" | npx wrangler secret put "$secret_name" --name "$worker_name" --env production

    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ ${secret_name} set successfully${NC}"
    else
        echo -e "${RED}✗ Failed to set ${secret_name}${NC}"
    fi
}

# Main API Worker Secrets
echo "📦 Main API Worker (must-be-viral-prod)"
echo "----------------------------------------"
echo "Required secrets:"
echo "  - JWT_SECRET"
echo "  - OPENAI_API_KEY (optional)"
echo ""

read -p "Enter JWT_SECRET (press Enter to use default): " jwt_secret
if [ -z "$jwt_secret" ]; then
    jwt_secret="your-super-secure-jwt-secret-$(date +%s)"
    echo "Using generated JWT secret"
fi

cd mustbeviral 2>/dev/null || cd /c/Users/ernij/OneDrive/Documents/Must\ Be\ Viral\ V2/mustbeviral

# Set JWT_SECRET for main worker
echo "$jwt_secret" | npx wrangler secret put JWT_SECRET --name must-be-viral-prod --env production

# Payment Worker Secrets
echo ""
echo "💳 Payment Worker (must-be-viral-payment-prod)"
echo "-----------------------------------------------"
echo "Required secrets:"
echo "  - JWT_SECRET (using same as main)"
echo "  - STRIPE_SECRET_KEY"
echo "  - STRIPE_WEBHOOK_SECRET"
echo ""

read -p "Enter STRIPE_SECRET_KEY (or skip): " stripe_key
if [ ! -z "$stripe_key" ]; then
    echo "$stripe_key" | npx wrangler secret put STRIPE_SECRET_KEY --name must-be-viral-payment-prod --env production

    read -p "Enter STRIPE_WEBHOOK_SECRET: " stripe_webhook
    if [ ! -z "$stripe_webhook" ]; then
        echo "$stripe_webhook" | npx wrangler secret put STRIPE_WEBHOOK_SECRET --name must-be-viral-payment-prod --env production
    fi
fi

# Set JWT_SECRET for payment worker (same as main)
echo "$jwt_secret" | npx wrangler secret put JWT_SECRET --name must-be-viral-payment-prod --env production

# WebSocket Worker Secrets
echo ""
echo "🔌 WebSocket Worker (must-be-viral-websocket-prod)"
echo "---------------------------------------------------"
echo "Required secrets:"
echo "  - JWT_SECRET (using same as main)"
echo ""

# Set JWT_SECRET for websocket worker (same as main)
echo "$jwt_secret" | npx wrangler secret put JWT_SECRET --name must-be-viral-websocket-prod --env production

# Summary
echo ""
echo "==========================================="
echo -e "${GREEN}✅ Secrets Configuration Summary${NC}"
echo "==========================================="
echo ""
echo "JWT_SECRET: Set for all workers"
echo "STRIPE_SECRET_KEY: ${stripe_key:+Set}${stripe_key:-Not set (optional)}"
echo "STRIPE_WEBHOOK_SECRET: ${stripe_webhook:+Set}${stripe_webhook:-Not set (optional)}"
echo ""
echo "You can update these secrets anytime using:"
echo "  npx wrangler secret put SECRET_NAME --name WORKER_NAME --env production"
echo ""
echo "To list secrets for a worker:"
echo "  npx wrangler secret list --name WORKER_NAME --env production"
echo ""