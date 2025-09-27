#!/bin/bash

# Must Be Viral V2 - Production Deployment Script
# This script handles the complete production deployment process

set -e  # Exit on error

# Configuration
DEPLOYMENT_ENV=${1:-production}
DRY_RUN=${2:-false}
ROLLBACK_ON_ERROR=true
HEALTH_CHECK_RETRIES=10
HEALTH_CHECK_INTERVAL=30

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

# Pre-deployment checks
pre_deployment_checks() {
    log_info "Running pre-deployment checks..."

    # Check if on correct branch
    CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
    if [[ "$CURRENT_BRANCH" != "main" && "$CURRENT_BRANCH" != "production" ]]; then
        log_warning "Not on main or production branch. Current branch: $CURRENT_BRANCH"
        read -p "Continue deployment? (y/n): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log_error "Deployment cancelled"
            exit 1
        fi
    fi

    # Check for uncommitted changes
    if [[ $(git status --porcelain) ]]; then
        log_error "Uncommitted changes detected. Please commit or stash changes."
        exit 1
    fi

    # Check if environment file exists
    if [[ ! -f ".env.${DEPLOYMENT_ENV}" ]]; then
        log_error "Environment file .env.${DEPLOYMENT_ENV} not found"
        exit 1
    fi

    # Load environment variables
    source ".env.${DEPLOYMENT_ENV}"

    # Verify required environment variables
    REQUIRED_VARS=(
        "CLOUDFLARE_ACCOUNT_ID"
        "CLOUDFLARE_API_TOKEN"
        "DATABASE_URL"
        "JWT_SECRET"
    )

    for var in "${REQUIRED_VARS[@]}"; do
        if [[ -z "${!var}" ]]; then
            log_error "Required environment variable $var is not set"
            exit 1
        fi
    done

    log_success "Pre-deployment checks passed"
}

# Run tests
run_tests() {
    log_info "Running test suite..."

    # Unit tests
    npm run test:unit || {
        log_error "Unit tests failed"
        exit 1
    }

    # Integration tests
    npm run test:integration || {
        log_error "Integration tests failed"
        exit 1
    }

    # E2E tests (optional for production deployment)
    if [[ "$RUN_E2E_TESTS" == "true" ]]; then
        npm run test:e2e || {
            log_error "E2E tests failed"
            exit 1
        }
    fi

    log_success "All tests passed"
}

# Build application
build_application() {
    log_info "Building application for ${DEPLOYMENT_ENV}..."

    # Clean previous builds
    rm -rf mustbeviral/.next mustbeviral/out mustbeviral/dist

    # Build frontend
    log_info "Building frontend..."
    cd mustbeviral
    npm run build || {
        log_error "Frontend build failed"
        exit 1
    }
    cd ..

    # Build workers
    log_info "Building Cloudflare Workers..."
    cd mustbeviral/workers
    npm run build || {
        log_error "Workers build failed"
        exit 1
    }
    cd ../..

    log_success "Build completed successfully"
}

# Create deployment backup
create_backup() {
    log_info "Creating backup before deployment..."

    BACKUP_DIR="backups/$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$BACKUP_DIR"

    # Backup database
    if [[ "$BACKUP_DATABASE" == "true" ]]; then
        log_info "Backing up database..."

        if [[ "$DATABASE_TYPE" == "d1" ]]; then
            wrangler d1 backup create mustbeviral-prod \
                --output-file "$BACKUP_DIR/database.sql" || {
                log_warning "Database backup failed"
            }
        elif [[ "$DATABASE_TYPE" == "postgresql" ]]; then
            pg_dump "$DATABASE_URL" > "$BACKUP_DIR/database.sql" || {
                log_warning "Database backup failed"
            }
        fi
    fi

    # Save current deployment info
    cat > "$BACKUP_DIR/deployment.json" << EOF
{
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "git_commit": "$(git rev-parse HEAD)",
    "git_branch": "$(git rev-parse --abbrev-ref HEAD)",
    "environment": "${DEPLOYMENT_ENV}",
    "previous_version": "${CURRENT_VERSION}"
}
EOF

    log_success "Backup created at $BACKUP_DIR"
    echo "$BACKUP_DIR" > .last_backup
}

# Run database migrations
run_migrations() {
    log_info "Running database migrations..."

    if [[ -d "mustbeviral/migrations" ]]; then
        cd mustbeviral

        if [[ "$DATABASE_TYPE" == "d1" ]]; then
            npm run migrate:d1 || {
                log_error "D1 migrations failed"
                exit 1
            }
        else
            npm run migrate || {
                log_error "Database migrations failed"
                exit 1
            }
        fi

        cd ..
        log_success "Migrations completed"
    else
        log_warning "No migrations directory found"
    fi
}

# Deploy Cloudflare Workers
deploy_workers() {
    log_info "Deploying Cloudflare Workers..."

    cd mustbeviral/workers

    # Deploy each worker
    WORKERS=("api-gateway" "analytics-worker" "auth-worker" "content-worker")

    for worker in "${WORKERS[@]}"; do
        log_info "Deploying $worker..."

        if [[ "$DRY_RUN" == "true" ]]; then
            wrangler deploy --dry-run --env "$DEPLOYMENT_ENV" \
                --compatibility-date 2024-01-01 \
                --name "mustbeviral-$worker-$DEPLOYMENT_ENV" || {
                log_error "Worker deployment dry-run failed for $worker"
                exit 1
            }
        else
            wrangler deploy --env "$DEPLOYMENT_ENV" \
                --compatibility-date 2024-01-01 \
                --name "mustbeviral-$worker-$DEPLOYMENT_ENV" || {
                log_error "Worker deployment failed for $worker"
                exit 1
            }
        fi
    done

    cd ../..
    log_success "Workers deployed successfully"
}

# Deploy Cloudflare Pages
deploy_pages() {
    log_info "Deploying Cloudflare Pages..."

    cd mustbeviral

    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "Skipping Pages deployment in dry-run mode"
    else
        wrangler pages deploy out \
            --project-name "mustbeviral-$DEPLOYMENT_ENV" \
            --branch "$DEPLOYMENT_ENV" || {
            log_error "Pages deployment failed"
            exit 1
        }
    fi

    cd ..
    log_success "Pages deployed successfully"
}

# Configure Cloudflare settings
configure_cloudflare() {
    log_info "Configuring Cloudflare settings..."

    # Set up KV namespaces
    log_info "Creating KV namespaces..."
    wrangler kv:namespace create "sessions" --env "$DEPLOYMENT_ENV" || true
    wrangler kv:namespace create "cache" --env "$DEPLOYMENT_ENV" || true
    wrangler kv:namespace create "rate_limit" --env "$DEPLOYMENT_ENV" || true

    # Set up D1 database
    if [[ "$DATABASE_TYPE" == "d1" ]]; then
        log_info "Creating D1 database..."
        wrangler d1 create "mustbeviral-$DEPLOYMENT_ENV" || true
    fi

    # Set up R2 buckets
    log_info "Creating R2 buckets..."
    wrangler r2 bucket create "mustbeviral-media-$DEPLOYMENT_ENV" || true

    # Configure secrets
    log_info "Configuring secrets..."
    echo "$JWT_SECRET" | wrangler secret put JWT_SECRET --env "$DEPLOYMENT_ENV"
    echo "$DATABASE_URL" | wrangler secret put DATABASE_URL --env "$DEPLOYMENT_ENV"

    if [[ -n "$STRIPE_SECRET_KEY" ]]; then
        echo "$STRIPE_SECRET_KEY" | wrangler secret put STRIPE_SECRET_KEY --env "$DEPLOYMENT_ENV"
    fi

    if [[ -n "$OPENAI_API_KEY" ]]; then
        echo "$OPENAI_API_KEY" | wrangler secret put OPENAI_API_KEY --env "$DEPLOYMENT_ENV"
    fi

    log_success "Cloudflare configuration completed"
}

# Health check
health_check() {
    log_info "Running health checks..."

    local API_URL
    if [[ "$DEPLOYMENT_ENV" == "production" ]]; then
        API_URL="https://api.mustbeviral.com"
    else
        API_URL="https://api-${DEPLOYMENT_ENV}.mustbeviral.com"
    fi

    local attempt=1
    while [[ $attempt -le $HEALTH_CHECK_RETRIES ]]; do
        log_info "Health check attempt $attempt/$HEALTH_CHECK_RETRIES"

        # Check main API
        if curl -f -s -o /dev/null -w "%{http_code}" "$API_URL/health" | grep -q "200"; then
            log_success "API health check passed"

            # Check specific endpoints
            ENDPOINTS=("/api/auth/status" "/api/content/public" "/metrics")

            for endpoint in "${ENDPOINTS[@]}"; do
                if curl -f -s -o /dev/null -w "%{http_code}" "$API_URL$endpoint" | grep -q -E "200|401"; then
                    log_success "Endpoint $endpoint is responsive"
                else
                    log_warning "Endpoint $endpoint returned non-200 status"
                fi
            done

            return 0
        fi

        log_warning "Health check failed, waiting ${HEALTH_CHECK_INTERVAL}s..."
        sleep "$HEALTH_CHECK_INTERVAL"
        ((attempt++))
    done

    log_error "Health checks failed after $HEALTH_CHECK_RETRIES attempts"
    return 1
}

# Rollback deployment
rollback() {
    log_error "Initiating rollback..."

    if [[ -f ".last_backup" ]]; then
        BACKUP_DIR=$(cat .last_backup)

        if [[ -f "$BACKUP_DIR/deployment.json" ]]; then
            PREVIOUS_COMMIT=$(jq -r '.git_commit' "$BACKUP_DIR/deployment.json")

            # Rollback git
            git checkout "$PREVIOUS_COMMIT"

            # Rebuild and redeploy
            build_application
            deploy_workers
            deploy_pages

            log_success "Rollback completed to commit $PREVIOUS_COMMIT"
        else
            log_error "Backup deployment info not found"
        fi
    else
        log_error "No backup information found for rollback"
    fi
}

# Send deployment notification
send_notification() {
    local status=$1
    local message=$2

    log_info "Sending deployment notification..."

    # Send to Slack (if configured)
    if [[ -n "$SLACK_WEBHOOK_URL" ]]; then
        curl -X POST "$SLACK_WEBHOOK_URL" \
            -H 'Content-Type: application/json' \
            -d "{
                \"text\": \"Deployment ${status}: ${message}\",
                \"channel\": \"#deployments\",
                \"username\": \"Deploy Bot\",
                \"icon_emoji\": \":rocket:\"
            }"
    fi

    # Send to monitoring service
    if [[ -n "$MONITORING_WEBHOOK_URL" ]]; then
        curl -X POST "$MONITORING_WEBHOOK_URL" \
            -H 'Content-Type: application/json' \
            -d "{
                \"event\": \"deployment\",
                \"status\": \"${status}\",
                \"environment\": \"${DEPLOYMENT_ENV}\",
                \"message\": \"${message}\",
                \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"
            }"
    fi
}

# Main deployment flow
main() {
    log_info "=========================================="
    log_info "Starting deployment to ${DEPLOYMENT_ENV}"
    log_info "Dry run: ${DRY_RUN}"
    log_info "=========================================="

    # Record start time
    START_TIME=$(date +%s)

    # Execute deployment steps
    pre_deployment_checks
    run_tests
    build_application

    if [[ "$DRY_RUN" != "true" ]]; then
        create_backup
    fi

    run_migrations
    deploy_workers
    deploy_pages
    configure_cloudflare

    # Verify deployment
    if health_check; then
        # Calculate deployment time
        END_TIME=$(date +%s)
        DEPLOYMENT_TIME=$((END_TIME - START_TIME))

        log_success "=========================================="
        log_success "Deployment completed successfully!"
        log_success "Environment: ${DEPLOYMENT_ENV}"
        log_success "Duration: ${DEPLOYMENT_TIME} seconds"
        log_success "=========================================="

        send_notification "SUCCESS" "Deployment to ${DEPLOYMENT_ENV} completed in ${DEPLOYMENT_TIME}s"
    else
        if [[ "$ROLLBACK_ON_ERROR" == "true" && "$DRY_RUN" != "true" ]]; then
            rollback
        fi

        log_error "Deployment failed!"
        send_notification "FAILED" "Deployment to ${DEPLOYMENT_ENV} failed. Check logs for details."
        exit 1
    fi
}

# Trap errors and cleanup
trap 'log_error "Deployment script failed on line $LINENO"' ERR

# Run main function
main "$@"