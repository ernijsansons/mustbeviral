#!/bin/bash

# Cloudflare Resource Setup Script for Must Be Viral V2
# Creates all required D1 databases, KV namespaces, and R2 buckets

set -e

# Configuration
ENVIRONMENT=${1:-staging}
DRY_RUN=${2:-false}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."

    # Check if wrangler is installed
    if ! command -v wrangler &> /dev/null; then
        log_error "Wrangler CLI is not installed. Please install it with: npm install -g wrangler"
        exit 1
    fi

    # Check Cloudflare credentials
    if [[ -z "${CLOUDFLARE_ACCOUNT_ID:-}" ]]; then
        log_error "CLOUDFLARE_ACCOUNT_ID environment variable is not set"
        exit 1
    fi

    if [[ -z "${CLOUDFLARE_API_TOKEN:-}" ]]; then
        log_error "CLOUDFLARE_API_TOKEN environment variable is not set"
        exit 1
    fi

    log_success "Prerequisites check passed"
}

# Create D1 databases
create_d1_databases() {
    log_info "Creating D1 databases..."

    local databases=(
        "must-be-viral-auth-${ENVIRONMENT}"
        "must-be-viral-content-${ENVIRONMENT}"
        "must-be-viral-analytics-${ENVIRONMENT}"
    )

    local created_databases=()

    for db in "${databases[@]}"; do
        log_info "Creating D1 database: $db"

        if [[ "$DRY_RUN" == "true" ]]; then
            log_warning "DRY RUN: Would create D1 database $db"
            continue
        fi

        # Check if database already exists
        if wrangler d1 list | grep -q "$db"; then
            log_warning "D1 database $db already exists"
            continue
        fi

        # Create the database
        if wrangler d1 create "$db"; then
            log_success "Created D1 database: $db"
            created_databases+=("$db")

            # Get the database ID
            local db_id=$(wrangler d1 list | grep "$db" | awk '{print $2}')
            log_info "Database ID for $db: $db_id"
            echo "D1_${db^^}_ID=$db_id" >> ".env.cloudflare-resources"
        else
            log_error "Failed to create D1 database: $db"
        fi
    done

    if [[ ${#created_databases[@]} -gt 0 ]]; then
        log_success "Created ${#created_databases[@]} D1 databases"
    fi
}

# Create KV namespaces
create_kv_namespaces() {
    log_info "Creating KV namespaces..."

    local namespaces=(
        "auth-session-store-${ENVIRONMENT}"
        "auth-refresh-store-${ENVIRONMENT}"
        "auth-ratelimit-${ENVIRONMENT}"
        "content-cache-${ENVIRONMENT}"
        "trends-cache-${ENVIRONMENT}"
        "analytics-metrics-${ENVIRONMENT}"
        "behavior-tracking-${ENVIRONMENT}"
        "ab-testing-${ENVIRONMENT}"
        "api-gateway-ratelimit-${ENVIRONMENT}"
        "api-gateway-keys-${ENVIRONMENT}"
        "api-gateway-cache-${ENVIRONMENT}"
        "api-gateway-circuit-${ENVIRONMENT}"
        "websocket-connections-${ENVIRONMENT}"
    )

    local created_namespaces=()

    for namespace in "${namespaces[@]}"; do
        log_info "Creating KV namespace: $namespace"

        if [[ "$DRY_RUN" == "true" ]]; then
            log_warning "DRY RUN: Would create KV namespace $namespace"
            continue
        fi

        # Check if namespace already exists
        if wrangler kv:namespace list | grep -q "$namespace"; then
            log_warning "KV namespace $namespace already exists"
            continue
        fi

        # Create the namespace
        if wrangler kv:namespace create "$namespace"; then
            log_success "Created KV namespace: $namespace"
            created_namespaces+=("$namespace")

            # Get the namespace ID
            local ns_id=$(wrangler kv:namespace list | grep "$namespace" | awk '{print $2}')
            log_info "Namespace ID for $namespace: $ns_id"

            # Create preview namespace
            local preview_namespace="${namespace}-preview"
            if wrangler kv:namespace create "$preview_namespace"; then
                local preview_id=$(wrangler kv:namespace list | grep "$preview_namespace" | awk '{print $2}')
                echo "KV_${namespace^^}_ID=$ns_id" >> ".env.cloudflare-resources"
                echo "KV_${namespace^^}_PREVIEW_ID=$preview_id" >> ".env.cloudflare-resources"
            fi
        else
            log_error "Failed to create KV namespace: $namespace"
        fi
    done

    if [[ ${#created_namespaces[@]} -gt 0 ]]; then
        log_success "Created ${#created_namespaces[@]} KV namespaces"
    fi
}

# Create R2 buckets
create_r2_buckets() {
    log_info "Creating R2 buckets..."

    local buckets=(
        "must-be-viral-assets-${ENVIRONMENT}"
        "must-be-viral-media-${ENVIRONMENT}"
        "must-be-viral-analytics-exports-${ENVIRONMENT}"
        "must-be-viral-backups-${ENVIRONMENT}"
    )

    local created_buckets=()

    for bucket in "${buckets[@]}"; do
        log_info "Creating R2 bucket: $bucket"

        if [[ "$DRY_RUN" == "true" ]]; then
            log_warning "DRY RUN: Would create R2 bucket $bucket"
            continue
        fi

        # Check if bucket already exists
        if wrangler r2 bucket list | grep -q "$bucket"; then
            log_warning "R2 bucket $bucket already exists"
            continue
        fi

        # Create the bucket
        if wrangler r2 bucket create "$bucket"; then
            log_success "Created R2 bucket: $bucket"
            created_buckets+=("$bucket")
            echo "R2_${bucket^^}_NAME=$bucket" >> ".env.cloudflare-resources"
        else
            log_error "Failed to create R2 bucket: $bucket"
        fi
    done

    if [[ ${#created_buckets[@]} -gt 0 ]]; then
        log_success "Created ${#created_buckets[@]} R2 buckets"
    fi
}

# Update wrangler.toml files with actual IDs
update_wrangler_configs() {
    log_info "Updating wrangler.toml files with actual resource IDs..."

    if [[ ! -f ".env.cloudflare-resources" ]]; then
        log_warning "No resource IDs file found, skipping config updates"
        return 0
    fi

    # Source the resource IDs
    source ".env.cloudflare-resources"

    local workers=("auth-worker" "content-worker" "analytics-worker" "api-gateway" "websocket-worker")

    for worker in "${workers[@]}"; do
        local wrangler_file="mustbeviral/workers/$worker/wrangler.toml"

        if [[ -f "$wrangler_file" ]]; then
            log_info "Updating $wrangler_file..."

            # Create backup
            cp "$wrangler_file" "$wrangler_file.backup"

            # Replace placeholder values (this is a simplified example)
            # In practice, you would need more sophisticated replacement logic
            sed -i 's/{{ ANALYTICS_DATABASE_ID }}/'$D1_MUST_BE_VIRAL_ANALYTICS_STAGING_ID'/g' "$wrangler_file" 2>/dev/null || true
            sed -i 's/{{ AUTH_DATABASE_ID }}/'$D1_MUST_BE_VIRAL_AUTH_STAGING_ID'/g' "$wrangler_file" 2>/dev/null || true

            log_success "Updated $wrangler_file"
        fi
    done
}

# Generate resource summary
generate_summary() {
    log_info "Generating resource summary..."

    local summary_file="cloudflare-resources-${ENVIRONMENT}-$(date +%Y%m%d_%H%M%S).txt"

    {
        echo "# Cloudflare Resources for Must Be Viral V2 ($ENVIRONMENT)"
        echo "# Generated on $(date)"
        echo ""
        echo "## D1 Databases"
        wrangler d1 list | grep "must-be-viral.*${ENVIRONMENT}" || echo "No D1 databases found"
        echo ""
        echo "## KV Namespaces"
        wrangler kv:namespace list | grep "${ENVIRONMENT}" || echo "No KV namespaces found"
        echo ""
        echo "## R2 Buckets"
        wrangler r2 bucket list | grep "${ENVIRONMENT}" || echo "No R2 buckets found"
        echo ""
        echo "## Next Steps"
        echo "1. Update .env.production with the actual resource IDs"
        echo "2. Update wrangler.toml files with the resource IDs"
        echo "3. Deploy workers: npm run cloudflare:workers:deploy"
        echo "4. Test all endpoints"
    } > "$summary_file"

    log_success "Resource summary saved to: $summary_file"
}

# Main function
main() {
    log_info "Setting up Cloudflare resources for $ENVIRONMENT environment..."
    log_info "Dry run: $DRY_RUN"

    case "$ENVIRONMENT" in
        "production"|"staging"|"development")
            check_prerequisites

            # Initialize resource tracking file
            echo "# Cloudflare Resource IDs for $ENVIRONMENT" > ".env.cloudflare-resources"
            echo "# Generated on $(date)" >> ".env.cloudflare-resources"

            create_d1_databases
            create_kv_namespaces
            create_r2_buckets
            update_wrangler_configs
            generate_summary

            log_success "🎉 Cloudflare resource setup completed!"
            log_info "📋 Resource IDs have been saved to .env.cloudflare-resources"
            log_info "📝 Next: Update your .env.production file with the actual resource IDs"
            ;;
        *)
            log_error "Invalid environment. Use: production, staging, or development"
            exit 1
            ;;
    esac
}

# Handle script interruption
trap 'log_error "Resource setup interrupted"; exit 1' INT TERM

# Show usage if no arguments provided
if [[ $# -eq 0 ]]; then
    echo "Usage: $0 <environment> [dry-run]"
    echo "  environment: production, staging, or development"
    echo "  dry-run: true or false (default: false)"
    echo ""
    echo "Examples:"
    echo "  $0 staging"
    echo "  $0 production false"
    echo "  $0 development true"
    exit 1
fi

# Run main function
main "$@"