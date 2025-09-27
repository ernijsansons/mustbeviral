#!/bin/bash

# Cloudflare Enterprise Deployment Script
# Handles deployment of Workers, Pages, and infrastructure

set -euo pipefail

# Configuration
ENVIRONMENT=${1:-staging}
DRY_RUN=${2:-false}
VERBOSE=${3:-false}

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
    
    # Check if we're in the right directory
    if [[ ! -d "mustbeviral/workers" ]]; then
        log_error "Workers directory not found. Please run this script from the project root."
        exit 1
    fi
    
    log_success "Prerequisites check passed"
}

# Deploy Cloudflare Workers
deploy_workers() {
    log_info "Deploying Cloudflare Workers to $ENVIRONMENT environment..."
    
    local workers=("auth-worker" "content-worker" "analytics-worker" "api-gateway" "websocket-worker")
    local failed_deployments=()
    
    for worker in "${workers[@]}"; do
        log_info "Deploying $worker..."
        
        if [[ "$DRY_RUN" == "true" ]]; then
            log_warning "DRY RUN: Would deploy $worker"
            continue
        fi
        
        cd "mustbeviral/workers/$worker" || {
            log_error "Failed to change to $worker directory"
            failed_deployments+=("$worker")
            continue
        }
        
        # Deploy the worker
        if wrangler deploy --env "$ENVIRONMENT" --compatibility-date 2024-12-01; then
            log_success "$worker deployed successfully"
        else
            log_error "Failed to deploy $worker"
            failed_deployments+=("$worker")
        fi
        
        cd - > /dev/null
    done
    
    if [[ ${#failed_deployments[@]} -gt 0 ]]; then
        log_error "Failed to deploy workers: ${failed_deployments[*]}"
        return 1
    fi
    
    log_success "All workers deployed successfully"
}

# Deploy Cloudflare Pages
deploy_pages() {
    log_info "Deploying Cloudflare Pages to $ENVIRONMENT environment..."
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_warning "DRY RUN: Would deploy Pages"
        return 0
    fi
    
    cd mustbeviral || {
        log_error "Failed to change to mustbeviral directory"
        return 1
    }
    
    # Build the application first
    log_info "Building Next.js application..."
    if ! npm run build; then
        log_error "Failed to build Next.js application"
        return 1
    fi
    
    # Deploy to Cloudflare Pages
    local project_name="must-be-viral-$ENVIRONMENT"
    if wrangler pages deploy out --project-name "$project_name"; then
        log_success "Pages deployed successfully to $project_name"
    else
        log_error "Failed to deploy Pages"
        return 1
    fi
    
    cd - > /dev/null
}

# Deploy D1 databases
deploy_databases() {
    log_info "Deploying D1 databases to $ENVIRONMENT environment..."
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_warning "DRY RUN: Would deploy databases"
        return 0
    fi
    
    local databases=("auth-db" "content-db" "analytics-db")
    
    for db in "${databases[@]}"; do
        log_info "Deploying $db..."
        
        # Create database if it doesn't exist
        if ! wrangler d1 list | grep -q "$db"; then
            log_info "Creating database $db..."
            wrangler d1 create "$db" || {
                log_warning "Database $db might already exist"
            }
        fi
        
        # Run migrations
        local worker_dir=""
        case $db in
            "auth-db")
                worker_dir="auth-worker"
                ;;
            "content-db")
                worker_dir="content-worker"
                ;;
            "analytics-db")
                worker_dir="analytics-worker"
                ;;
        esac
        
        if [[ -n "$worker_dir" && -d "mustbeviral/workers/$worker_dir/migrations" ]]; then
            log_info "Running migrations for $db..."
            wrangler d1 migrations apply "$db" --env "$ENVIRONMENT" || {
                log_warning "Migrations for $db might have already been applied"
            }
        fi
    done
    
    log_success "Database deployment completed"
}

# Deploy KV namespaces
deploy_kv_namespaces() {
    log_info "Deploying KV namespaces to $ENVIRONMENT environment..."
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_warning "DRY RUN: Would deploy KV namespaces"
        return 0
    fi
    
    local namespaces=(
        "auth-session-store"
        "auth-refresh-store"
        "auth-ratelimit"
        "content-cache"
        "trends-cache"
        "analytics-metrics"
        "behavior-tracking"
        "ab-testing"
        "api-gateway-ratelimit"
        "api-gateway-keys"
        "api-gateway-cache"
        "api-gateway-circuit"
        "websocket-connections"
    )
    
    for namespace in "${namespaces[@]}"; do
        log_info "Creating KV namespace $namespace..."
        
        if ! wrangler kv:namespace list | grep -q "$namespace"; then
            wrangler kv:namespace create "$namespace" || {
                log_warning "KV namespace $namespace might already exist"
            }
        fi
    done
    
    log_success "KV namespaces deployment completed"
}

# Deploy R2 buckets
deploy_r2_buckets() {
    log_info "Deploying R2 buckets to $ENVIRONMENT environment..."
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_warning "DRY RUN: Would deploy R2 buckets"
        return 0
    fi
    
    local buckets=(
        "must-be-viral-assets"
        "must-be-viral-media"
        "must-be-viral-analytics-exports"
    )
    
    for bucket in "${buckets[@]}"; do
        log_info "Creating R2 bucket $bucket..."
        
        if ! wrangler r2 bucket list | grep -q "$bucket"; then
            wrangler r2 bucket create "$bucket" || {
                log_warning "R2 bucket $bucket might already exist"
            }
        fi
    done
    
    log_success "R2 buckets deployment completed"
}

# Health check
health_check() {
    log_info "Performing health checks..."
    
    local services=(
        "https://api.mustbeviral.com/health"
        "https://auth.mustbeviral.com/health"
        "https://content.mustbeviral.com/health"
        "https://analytics.mustbeviral.com/health"
        "https://ws.mustbeviral.com/health"
    )
    
    local failed_checks=()
    
    for service in "${services[@]}"; do
        log_info "Checking $service..."
        
        if curl -f -s "$service" > /dev/null; then
            log_success "$service is healthy"
        else
            log_error "$service is not responding"
            failed_checks+=("$service")
        fi
    done
    
    if [[ ${#failed_checks[@]} -gt 0 ]]; then
        log_error "Health checks failed for: ${failed_checks[*]}"
        return 1
    fi
    
    log_success "All health checks passed"
}

# Rollback function
rollback() {
    log_warning "Rolling back deployment..."
    
    # This would implement rollback logic
    # For now, just log the action
    log_info "Rollback functionality not yet implemented"
}

# Main deployment flow
main() {
    log_info "Starting Cloudflare deployment process..."
    log_info "Environment: $ENVIRONMENT"
    log_info "Dry run: $DRY_RUN"
    log_info "Verbose: $VERBOSE"
    
    case "$ENVIRONMENT" in
        "staging"|"production")
            check_prerequisites
            deploy_databases
            deploy_kv_namespaces
            deploy_r2_buckets
            deploy_workers
            deploy_pages
            
            if [[ "$DRY_RUN" != "true" ]]; then
                sleep 30  # Wait for deployments to stabilize
                health_check
            fi
            
            log_success "Deployment process completed successfully!"
            ;;
        "rollback")
            rollback
            ;;
        *)
            log_error "Invalid environment. Use: staging, production, or rollback"
            exit 1
            ;;
    esac
}

# Handle script interruption
trap 'log_error "Deployment interrupted"; rollback; exit 1' INT TERM

# Show usage if no arguments provided
if [[ $# -eq 0 ]]; then
    echo "Usage: $0 <environment> [dry-run] [verbose]"
    echo "  environment: staging, production, or rollback"
    echo "  dry-run: true or false (default: false)"
    echo "  verbose: true or false (default: false)"
    echo ""
    echo "Examples:"
    echo "  $0 staging"
    echo "  $0 production false true"
    echo "  $0 staging true"
    exit 1
fi

# Run main function
main "$@"








