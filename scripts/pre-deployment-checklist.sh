#!/bin/bash

# Pre-Deployment Checklist for Must Be Viral V2
# Validates all requirements before deployment

set -e

# Configuration
ENVIRONMENT=${1:-staging}
FIX_ISSUES=${2:-false}

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
    echo -e "${GREEN}[✓]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[⚠]${NC} $1"
}

log_error() {
    echo -e "${RED}[✗]${NC} $1"
}

# Checklist results
declare -a PASSED_CHECKS=()
declare -a FAILED_CHECKS=()
declare -a WARNINGS=()

# Check if file exists
check_file() {
    local file="$1"
    local description="$2"

    if [[ -f "$file" ]]; then
        log_success "$description exists: $file"
        PASSED_CHECKS+=("$description")
        return 0
    else
        log_error "$description missing: $file"
        FAILED_CHECKS+=("$description")
        return 1
    fi
}

# Check if directory exists
check_directory() {
    local dir="$1"
    local description="$2"

    if [[ -d "$dir" ]]; then
        log_success "$description exists: $dir"
        PASSED_CHECKS+=("$description")
        return 0
    else
        log_error "$description missing: $dir"
        FAILED_CHECKS+=("$description")
        return 1
    fi
}

# Check command availability
check_command() {
    local cmd="$1"
    local description="$2"

    if command -v "$cmd" &> /dev/null; then
        local version=$($cmd --version 2>/dev/null | head -n1 || echo "Unknown version")
        log_success "$description available: $version"
        PASSED_CHECKS+=("$description")
        return 0
    else
        log_error "$description not available: $cmd"
        FAILED_CHECKS+=("$description")
        return 1
    fi
}

# Check environment variables
check_environment_variables() {
    log_info "Checking environment variables..."

    local env_file
    case $ENVIRONMENT in
        "production")
            env_file=".env.production"
            ;;
        "staging")
            env_file=".env.staging"
            ;;
        *)
            env_file=".env"
            ;;
    esac

    if check_file "$env_file" "Environment file"; then
        # Load environment variables
        export $(grep -v '^#' "$env_file" | xargs) 2>/dev/null || true

        # Check critical environment variables
        local critical_vars=(
            "NODE_ENV"
            "DATABASE_URL"
            "JWT_SECRET"
            "CLOUDFLARE_ACCOUNT_ID"
            "CLOUDFLARE_API_TOKEN"
        )

        for var in "${critical_vars[@]}"; do
            if [[ -n "${!var:-}" ]]; then
                log_success "Environment variable set: $var"
                PASSED_CHECKS+=("Env Var: $var")
            else
                log_error "Environment variable missing: $var"
                FAILED_CHECKS+=("Env Var: $var")
            fi
        done

        # Check for placeholder values
        local placeholder_patterns=("your_" "CHANGE_ME" "TODO:" "{{ ")
        local has_placeholders=false

        for pattern in "${placeholder_patterns[@]}"; do
            if grep -q "$pattern" "$env_file" 2>/dev/null; then
                log_warning "Found placeholder values in $env_file (pattern: $pattern)"
                WARNINGS+=("Placeholder values in $env_file")
                has_placeholders=true
            fi
        done

        if [[ "$has_placeholders" == "false" ]]; then
            log_success "No placeholder values found in environment file"
            PASSED_CHECKS+=("No placeholders in env file")
        fi
    fi
}

# Check required tools
check_required_tools() {
    log_info "Checking required tools..."

    local tools=(
        "node:Node.js"
        "npm:NPM"
        "wrangler:Cloudflare Wrangler"
        "docker:Docker"
        "psql:PostgreSQL client"
        "curl:cURL"
        "openssl:OpenSSL"
        "git:Git"
    )

    for tool_info in "${tools[@]}"; do
        local tool="${tool_info%%:*}"
        local description="${tool_info##*:}"
        check_command "$tool" "$description"
    done
}

# Check project structure
check_project_structure() {
    log_info "Checking project structure..."

    local required_files=(
        "package.json:Root package.json"
        "tsconfig.json:TypeScript configuration"
        "Dockerfile:Main Dockerfile"
        "Dockerfile.optimized:Optimized Dockerfile"
        "Dockerfile.cloudflare:Cloudflare Dockerfile"
        "docker-compose.yml:Docker Compose configuration"
        "mustbeviral/package.json:App package.json"
        "mustbeviral/vite.config.ts:Vite configuration"
        "scripts/cloudflare-deploy.sh:Cloudflare deployment script"
        "scripts/migrate.sh:Migration script"
        "scripts/validate-deployment.sh:Validation script"
        "nginx/nginx.conf:Nginx configuration"
        "database/scripts/migrate.sh:Database migration script"
    )

    for file_info in "${required_files[@]}"; do
        local file="${file_info%%:*}"
        local description="${file_info##*:}"
        check_file "$file" "$description"
    done

    local required_dirs=(
        "mustbeviral/src:Source code directory"
        "mustbeviral/workers:Cloudflare Workers directory"
        "nginx/ssl:SSL certificates directory"
        "database/migrations:Database migrations directory"
        "monitoring:Monitoring configuration directory"
    )

    for dir_info in "${required_dirs[@]}"; do
        local dir="${dir_info%%:*}"
        local description="${dir_info##*:}"
        check_directory "$dir" "$description"
    done
}

# Check dependencies
check_dependencies() {
    log_info "Checking dependencies..."

    # Root dependencies
    if [[ -f "package.json" ]]; then
        if [[ -d "node_modules" ]]; then
            log_success "Root dependencies installed"
            PASSED_CHECKS+=("Root dependencies")
        else
            log_error "Root dependencies not installed"
            FAILED_CHECKS+=("Root dependencies")

            if [[ "$FIX_ISSUES" == "true" ]]; then
                log_info "Installing root dependencies..."
                npm ci
            fi
        fi
    fi

    # App dependencies
    if [[ -f "mustbeviral/package.json" ]]; then
        if [[ -d "mustbeviral/node_modules" ]]; then
            log_success "App dependencies installed"
            PASSED_CHECKS+=("App dependencies")
        else
            log_error "App dependencies not installed"
            FAILED_CHECKS+=("App dependencies")

            if [[ "$FIX_ISSUES" == "true" ]]; then
                log_info "Installing app dependencies..."
                cd mustbeviral && npm ci --legacy-peer-deps && cd ..
            fi
        fi
    fi
}

# Check build configuration
check_build_configuration() {
    log_info "Checking build configuration..."

    # Test build process
    log_info "Testing build process..."

    if npm run build &>/dev/null; then
        log_success "Build process working"
        PASSED_CHECKS+=("Build process")
    else
        log_error "Build process failed"
        FAILED_CHECKS+=("Build process")
    fi

    # Check TypeScript compilation
    if npx tsc --noEmit &>/dev/null; then
        log_success "TypeScript compilation successful"
        PASSED_CHECKS+=("TypeScript compilation")
    else
        log_warning "TypeScript compilation issues"
        WARNINGS+=("TypeScript compilation")
    fi

    # Check linting
    if npm run lint &>/dev/null; then
        log_success "Linting passed"
        PASSED_CHECKS+=("Linting")
    else
        log_warning "Linting issues found"
        WARNINGS+=("Linting")

        if [[ "$FIX_ISSUES" == "true" ]]; then
            log_info "Fixing linting issues..."
            npm run lint:fix &>/dev/null || true
        fi
    fi
}

# Check SSL certificates (for production)
check_ssl_certificates() {
    if [[ "$ENVIRONMENT" == "development" ]]; then
        log_info "Skipping SSL certificate check for development environment"
        return 0
    fi

    log_info "Checking SSL certificates..."

    local ssl_dir="nginx/ssl"

    if [[ -f "$ssl_dir/cert.pem" && -f "$ssl_dir/key.pem" ]]; then
        # Check certificate validity
        if openssl x509 -in "$ssl_dir/cert.pem" -noout -checkend 86400 &>/dev/null; then
            log_success "SSL certificate valid"
            PASSED_CHECKS+=("SSL certificate validity")
        else
            log_error "SSL certificate expired or expiring within 24 hours"
            FAILED_CHECKS+=("SSL certificate validity")
        fi

        # Check certificate and key match
        cert_modulus=$(openssl x509 -noout -modulus -in "$ssl_dir/cert.pem" | openssl md5)
        key_modulus=$(openssl rsa -noout -modulus -in "$ssl_dir/key.pem" | openssl md5)

        if [[ "$cert_modulus" == "$key_modulus" ]]; then
            log_success "SSL certificate and key match"
            PASSED_CHECKS+=("SSL certificate key match")
        else
            log_error "SSL certificate and key do not match"
            FAILED_CHECKS+=("SSL certificate key match")
        fi
    else
        log_error "SSL certificate files missing"
        FAILED_CHECKS+=("SSL certificate files")

        if [[ "$FIX_ISSUES" == "true" ]]; then
            log_info "Generating development SSL certificates..."
            cd "$ssl_dir" && ./generate-dev-certs.sh && cd - &>/dev/null
        fi
    fi
}

# Check Cloudflare configuration
check_cloudflare_configuration() {
    log_info "Checking Cloudflare configuration..."

    # Check wrangler authentication
    if wrangler whoami &>/dev/null; then
        log_success "Wrangler authenticated"
        PASSED_CHECKS+=("Wrangler authentication")
    else
        log_error "Wrangler not authenticated"
        FAILED_CHECKS+=("Wrangler authentication")
    fi

    # Check wrangler.toml files
    local workers=("auth-worker" "content-worker" "analytics-worker" "api-gateway" "websocket-worker")

    for worker in "${workers[@]}"; do
        local wrangler_file="mustbeviral/workers/$worker/wrangler.toml"

        if check_file "$wrangler_file" "Wrangler config for $worker"; then
            # Check for placeholder values
            if grep -q "{{ " "$wrangler_file" 2>/dev/null; then
                log_warning "Placeholder values found in $wrangler_file"
                WARNINGS+=("Placeholders in $worker wrangler.toml")
            else
                log_success "No placeholders in $worker wrangler.toml"
                PASSED_CHECKS+=("No placeholders in $worker wrangler.toml")
            fi
        fi
    done
}

# Check database configuration
check_database_configuration() {
    log_info "Checking database configuration..."

    if [[ -n "${DATABASE_URL:-}" ]]; then
        # Test database connection
        if psql "$DATABASE_URL" -c "SELECT 1;" &>/dev/null; then
            log_success "Database connection successful"
            PASSED_CHECKS+=("Database connection")

            # Check if migrations are up to date
            if [[ -f "database/scripts/migrate.sh" ]]; then
                if ./database/scripts/migrate.sh "$ENVIRONMENT" true &>/dev/null; then
                    log_success "Database migrations ready"
                    PASSED_CHECKS+=("Database migrations")
                else
                    log_warning "Database migration issues"
                    WARNINGS+=("Database migrations")
                fi
            fi
        else
            log_error "Database connection failed"
            FAILED_CHECKS+=("Database connection")
        fi
    else
        log_error "DATABASE_URL not configured"
        FAILED_CHECKS+=("DATABASE_URL configuration")
    fi
}

# Check monitoring configuration
check_monitoring_configuration() {
    log_info "Checking monitoring configuration..."

    local monitoring_files=(
        "monitoring/prometheus.yml:Prometheus configuration"
        "monitoring/grafana/dashboard.json:Grafana dashboard"
        "monitoring/alerts/performance.yml:Performance alerts"
    )

    for file_info in "${monitoring_files[@]}"; do
        local file="${file_info%%:*}"
        local description="${file_info##*:}"
        check_file "$file" "$description"
    done
}

# Generate checklist report
generate_checklist_report() {
    local total_checks=$((${#PASSED_CHECKS[@]} + ${#FAILED_CHECKS[@]} + ${#WARNINGS[@]}))
    local pass_rate=0

    if [[ $total_checks -gt 0 ]]; then
        pass_rate=$(( (${#PASSED_CHECKS[@]} * 100) / total_checks ))
    fi

    echo ""
    echo "=========================================="
    echo "  PRE-DEPLOYMENT CHECKLIST REPORT"
    echo "=========================================="
    echo "Environment: $ENVIRONMENT"
    echo "Timestamp: $(date)"
    echo ""
    echo "📊 Checklist Summary:"
    echo "  Total Checks: $total_checks"
    echo "  Passed: ${#PASSED_CHECKS[@]}"
    echo "  Failed: ${#FAILED_CHECKS[@]}"
    echo "  Warnings: ${#WARNINGS[@]}"
    echo "  Pass Rate: ${pass_rate}%"
    echo ""

    if [[ ${#FAILED_CHECKS[@]} -eq 0 ]]; then
        echo "🎉 All critical checks passed! Ready for deployment."
    else
        echo "❌ Critical issues found. Fix before deployment:"
        for check in "${FAILED_CHECKS[@]}"; do
            echo "  - $check"
        done
    fi

    if [[ ${#WARNINGS[@]} -gt 0 ]]; then
        echo ""
        echo "⚠️  Warnings (review recommended):"
        for warning in "${WARNINGS[@]}"; do
            echo "  - $warning"
        done
    fi

    echo ""
    echo "=========================================="

    # Save report to file
    local report_file="pre-deployment-checklist-${ENVIRONMENT}-$(date +%Y%m%d_%H%M%S).txt"
    {
        echo "Pre-Deployment Checklist Report"
        echo "Environment: $ENVIRONMENT"
        echo "Timestamp: $(date)"
        echo ""
        echo "Passed: ${#PASSED_CHECKS[@]}"
        echo "Failed: ${#FAILED_CHECKS[@]}"
        echo "Warnings: ${#WARNINGS[@]}"
        echo "Pass Rate: ${pass_rate}%"
        echo ""
        if [[ ${#FAILED_CHECKS[@]} -gt 0 ]]; then
            echo "Failed Checks:"
            for check in "${FAILED_CHECKS[@]}"; do
                echo "  - $check"
            done
        fi
    } > "$report_file"

    log_info "Checklist report saved to: $report_file"

    # Return appropriate exit code
    if [[ ${#FAILED_CHECKS[@]} -gt 0 ]]; then
        return 1
    else
        return 0
    fi
}

# Main checklist flow
main() {
    log_info "Starting pre-deployment checklist for $ENVIRONMENT..."
    log_info "Fix issues automatically: $FIX_ISSUES"

    # Run all checks
    check_required_tools
    check_project_structure
    check_environment_variables
    check_dependencies
    check_build_configuration
    check_ssl_certificates
    check_cloudflare_configuration
    check_database_configuration
    check_monitoring_configuration

    # Generate and display report
    if generate_checklist_report; then
        log_success "🎉 Pre-deployment checklist completed successfully!"
        log_info "✅ Ready for deployment to $ENVIRONMENT"
        exit 0
    else
        log_error "💥 Pre-deployment checklist failed!"
        log_error "❌ Fix critical issues before deploying to $ENVIRONMENT"
        exit 1
    fi
}

# Handle script interruption
trap 'log_error "Checklist interrupted"; exit 1' INT TERM

# Show usage if no arguments provided
if [[ $# -eq 0 ]]; then
    echo "Usage: $0 <environment> [fix-issues]"
    echo "  environment: development, staging, or production"
    echo "  fix-issues: true or false (default: false)"
    echo ""
    echo "Examples:"
    echo "  $0 staging"
    echo "  $0 production false"
    echo "  $0 development true"
    exit 1
fi

# Validate environment parameter
if [[ ! "$ENVIRONMENT" =~ ^(development|staging|production)$ ]]; then
    log_error "Invalid environment. Use: development, staging, or production"
    exit 1
fi

# Run main function
main "$@"