#!/bin/bash

# Production Migration Runner for Must Be Viral V2
# Handles both PostgreSQL and Cloudflare D1 migrations

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
ENVIRONMENT=${1:-staging}
DRY_RUN=${2:-false}
BACKUP_ENABLED=${3:-true}

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

# Load environment variables
load_environment() {
    log_info "Loading environment configuration for $ENVIRONMENT..."

    case $ENVIRONMENT in
        "production")
            ENV_FILE="$PROJECT_ROOT/.env.production"
            ;;
        "staging")
            ENV_FILE="$PROJECT_ROOT/.env.staging"
            ;;
        *)
            ENV_FILE="$PROJECT_ROOT/.env"
            ;;
    esac

    if [[ -f "$ENV_FILE" ]]; then
        export $(grep -v '^#' "$ENV_FILE" | xargs)
        log_success "Environment loaded from $ENV_FILE"
    else
        log_error "Environment file not found: $ENV_FILE"
        exit 1
    fi
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."

    # Check required tools
    local required_tools=("node" "npm" "wrangler" "pg_dump" "psql")
    for tool in "${required_tools[@]}"; do
        if ! command -v "$tool" &> /dev/null; then
            log_error "$tool is not installed or not in PATH"
            exit 1
        fi
    done

    # Check database connection
    if ! psql "$DATABASE_URL" -c "SELECT 1;" &> /dev/null; then
        log_error "Cannot connect to PostgreSQL database"
        exit 1
    fi

    # Check Cloudflare credentials
    if [[ -z "$CLOUDFLARE_ACCOUNT_ID" || -z "$CLOUDFLARE_API_TOKEN" ]]; then
        log_error "Cloudflare credentials not configured"
        exit 1
    fi

    log_success "Prerequisites check passed"
}

# Create backup
create_backup() {
    if [[ "$BACKUP_ENABLED" != "true" ]]; then
        log_warning "Backup disabled, skipping..."
        return 0
    fi

    log_info "Creating database backup..."

    local backup_dir="$PROJECT_ROOT/backups"
    local timestamp=$(date +"%Y%m%d_%H%M%S")
    local pg_backup="$backup_dir/postgres_${ENVIRONMENT}_${timestamp}.sql"

    mkdir -p "$backup_dir"

    # PostgreSQL backup
    log_info "Backing up PostgreSQL database..."
    if pg_dump "$DATABASE_URL" > "$pg_backup"; then
        log_success "PostgreSQL backup created: $pg_backup"
    else
        log_error "PostgreSQL backup failed"
        exit 1
    fi

    # D1 backups
    log_info "Backing up D1 databases..."
    local workers=("auth-worker" "content-worker" "analytics-worker")

    for worker in "${workers[@]}"; do
        local worker_dir="$PROJECT_ROOT/mustbeviral/workers/$worker"
        if [[ -d "$worker_dir" ]]; then
            cd "$worker_dir"
            local db_name=$(grep -o 'database_name = "[^"]*"' wrangler.toml | cut -d'"' -f2)
            if [[ -n "$db_name" ]]; then
                local d1_backup="$backup_dir/d1_${worker}_${ENVIRONMENT}_${timestamp}.sql"
                if wrangler d1 export "$db_name" --env "$ENVIRONMENT" > "$d1_backup"; then
                    log_success "D1 backup created for $worker: $d1_backup"
                else
                    log_warning "D1 backup failed for $worker"
                fi
            fi
        fi
    done

    cd "$PROJECT_ROOT"
}

# Run PostgreSQL migrations
migrate_postgresql() {
    log_info "Running PostgreSQL migrations..."

    cd "$PROJECT_ROOT/mustbeviral"

    # Check if Drizzle is configured
    if [[ ! -f "drizzle.config.ts" ]]; then
        log_error "Drizzle configuration not found"
        exit 1
    fi

    if [[ "$DRY_RUN" == "true" ]]; then
        log_warning "DRY RUN: Would apply PostgreSQL migrations"
        return 0
    fi

    # Install dependencies if needed
    if [[ ! -d "node_modules" ]]; then
        log_info "Installing dependencies..."
        npm ci --legacy-peer-deps
    fi

    # Check for pending migrations
    log_info "Checking for pending migrations..."
    if npx drizzle-kit generate:pg --config=drizzle.config.ts; then
        log_info "Applying migrations to PostgreSQL..."
        if npx drizzle-kit push:pg --config=drizzle.config.ts; then
            log_success "PostgreSQL migrations applied successfully"
        else
            log_error "PostgreSQL migration failed"
            exit 1
        fi
    else
        log_success "No PostgreSQL migrations needed"
    fi

    cd "$PROJECT_ROOT"
}

# Run D1 migrations
migrate_d1() {
    log_info "Running D1 migrations..."

    local workers=("auth-worker" "content-worker" "analytics-worker" "api-gateway" "websocket-worker")
    local failed_migrations=()

    for worker in "${workers[@]}"; do
        local worker_dir="$PROJECT_ROOT/mustbeviral/workers/$worker"

        if [[ ! -d "$worker_dir" ]]; then
            log_warning "Worker directory not found: $worker"
            continue
        fi

        cd "$worker_dir"

        # Check for migrations directory
        if [[ ! -d "migrations" ]]; then
            log_info "No migrations directory for $worker, skipping..."
            continue
        fi

        # Get database name from wrangler.toml
        local db_name=$(grep -o 'database_name = "[^"]*"' wrangler.toml | cut -d'"' -f2)

        if [[ -z "$db_name" ]]; then
            log_warning "No database configured for $worker"
            continue
        fi

        log_info "Migrating D1 database for $worker ($db_name)..."

        if [[ "$DRY_RUN" == "true" ]]; then
            log_warning "DRY RUN: Would migrate $worker D1 database"
            continue
        fi

        # Apply migrations
        if wrangler d1 migrations apply "$db_name" --env "$ENVIRONMENT"; then
            log_success "D1 migrations applied for $worker"
        else
            log_error "D1 migration failed for $worker"
            failed_migrations+=("$worker")
        fi
    done

    cd "$PROJECT_ROOT"

    if [[ ${#failed_migrations[@]} -gt 0 ]]; then
        log_error "D1 migrations failed for: ${failed_migrations[*]}"
        exit 1
    fi

    log_success "All D1 migrations completed successfully"
}

# Validate migrations
validate_migrations() {
    log_info "Validating migrations..."

    # PostgreSQL validation
    log_info "Validating PostgreSQL schema..."
    local validation_sql="$PROJECT_ROOT/database/scripts/validate.sql"

    if [[ -f "$validation_sql" ]]; then
        if psql "$DATABASE_URL" -f "$validation_sql" &> /dev/null; then
            log_success "PostgreSQL schema validation passed"
        else
            log_error "PostgreSQL schema validation failed"
            exit 1
        fi
    else
        log_warning "No PostgreSQL validation script found"
    fi

    # D1 validation (basic connectivity check)
    log_info "Validating D1 databases..."
    local workers=("auth-worker" "content-worker" "analytics-worker")

    for worker in "${workers[@]}"; do
        local worker_dir="$PROJECT_ROOT/mustbeviral/workers/$worker"

        if [[ -d "$worker_dir" ]]; then
            cd "$worker_dir"
            local db_name=$(grep -o 'database_name = "[^"]*"' wrangler.toml | cut -d'"' -f2)

            if [[ -n "$db_name" ]]; then
                if wrangler d1 execute "$db_name" --command "SELECT 1;" --env "$ENVIRONMENT" &> /dev/null; then
                    log_success "D1 database validation passed for $worker"
                else
                    log_warning "D1 database validation failed for $worker"
                fi
            fi
        fi
    done

    cd "$PROJECT_ROOT"
    log_success "Migration validation completed"
}

# Run post-migration tasks
post_migration() {
    log_info "Running post-migration tasks..."

    # Update schema version (if tracking exists)
    local schema_version=$(date +"%Y%m%d_%H%M%S")
    echo "SCHEMA_VERSION=$schema_version" > "$PROJECT_ROOT/.schema_version"

    # Run any seed data scripts for the environment
    local seed_file="$PROJECT_ROOT/database/seeds/${ENVIRONMENT}.sql"
    if [[ -f "$seed_file" ]]; then
        log_info "Running seed data for $ENVIRONMENT..."
        if psql "$DATABASE_URL" -f "$seed_file"; then
            log_success "Seed data applied successfully"
        else
            log_warning "Seed data failed to apply"
        fi
    fi

    log_success "Post-migration tasks completed"
}

# Main migration flow
main() {
    log_info "Starting database migration for $ENVIRONMENT environment..."
    log_info "Dry run: $DRY_RUN"
    log_info "Backup enabled: $BACKUP_ENABLED"

    case "$ENVIRONMENT" in
        "production"|"staging"|"development")
            load_environment
            check_prerequisites
            create_backup
            migrate_postgresql
            migrate_d1
            validate_migrations
            post_migration

            log_success "🎉 Database migration completed successfully!"
            ;;
        "rollback")
            log_info "Rollback functionality - use rollback.sh script"
            exit 1
            ;;
        *)
            log_error "Invalid environment. Use: production, staging, or development"
            exit 1
            ;;
    esac
}

# Handle script interruption
trap 'log_error "Migration interrupted! Check database state before retrying."; exit 1' INT TERM

# Show usage if no arguments provided
if [[ $# -eq 0 ]]; then
    echo "Usage: $0 <environment> [dry-run] [backup-enabled]"
    echo "  environment: production, staging, or development"
    echo "  dry-run: true or false (default: false)"
    echo "  backup-enabled: true or false (default: true)"
    echo ""
    echo "Examples:"
    echo "  $0 staging"
    echo "  $0 production false true"
    echo "  $0 development true false"
    exit 1
fi

# Run main function
main "$@"