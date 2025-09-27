#!/bin/bash

# Comprehensive Deployment Validation Script for Must Be Viral V2
# Performs end-to-end testing after deployment

set -e

# Configuration
ENVIRONMENT=${1:-staging}
SKIP_LOAD_TEST=${2:-false}
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

# Test results tracking
declare -a PASSED_TESTS=()
declare -a FAILED_TESTS=()
declare -a WARNINGS=()

# Test individual endpoint
test_endpoint() {
    local name="$1"
    local url="$2"
    local expected_status="${3:-200}"
    local timeout="${4:-10}"

    log_info "Testing $name: $url"

    local response_code
    local response_time

    if response_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$timeout" "$url" 2>/dev/null); then
        response_time=$(curl -s -o /dev/null -w "%{time_total}" --max-time "$timeout" "$url" 2>/dev/null)

        if [[ "$response_code" == "$expected_status" ]]; then
            log_success "$name: OK (${response_code}, ${response_time}s)"
            PASSED_TESTS+=("$name")
        else
            log_error "$name: FAILED (Expected: $expected_status, Got: $response_code)"
            FAILED_TESTS+=("$name")
        fi
    else
        log_error "$name: FAILED (No response)"
        FAILED_TESTS+=("$name")
    fi
}

# Test SSL certificate
test_ssl() {
    local domain="$1"

    log_info "Testing SSL certificate for $domain"

    if openssl s_client -connect "$domain:443" -servername "$domain" </dev/null 2>/dev/null | openssl x509 -noout -dates 2>/dev/null; then
        local expiry=$(openssl s_client -connect "$domain:443" -servername "$domain" </dev/null 2>/dev/null | openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2)
        log_success "SSL certificate valid until: $expiry"
        PASSED_TESTS+=("SSL Certificate")
    else
        log_error "SSL certificate test failed"
        FAILED_TESTS+=("SSL Certificate")
    fi
}

# Test database connectivity
test_database() {
    log_info "Testing database connectivity..."

    if [[ -n "${DATABASE_URL:-}" ]]; then
        if psql "$DATABASE_URL" -c "SELECT 1;" &>/dev/null; then
            log_success "Database connectivity: OK"
            PASSED_TESTS+=("Database Connectivity")

            # Test basic queries
            if psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM information_schema.tables;" &>/dev/null; then
                log_success "Database queries: OK"
                PASSED_TESTS+=("Database Queries")
            else
                log_warning "Database queries failed"
                WARNINGS+=("Database Queries")
            fi
        else
            log_error "Database connectivity failed"
            FAILED_TESTS+=("Database Connectivity")
        fi
    else
        log_warning "DATABASE_URL not set, skipping database tests"
        WARNINGS+=("Database Configuration")
    fi
}

# Test Cloudflare Workers
test_cloudflare_workers() {
    log_info "Testing Cloudflare Workers..."

    local workers=("auth" "content" "analytics" "api-gateway" "websocket")

    for worker in "${workers[@]}"; do
        # This is a simplified test - in practice you'd test specific worker endpoints
        case $ENVIRONMENT in
            "production")
                local worker_url="https://mustbeviral.com/api/$worker/health"
                ;;
            "staging")
                local worker_url="https://staging.mustbeviral.com/api/$worker/health"
                ;;
            *)
                local worker_url="http://localhost:3000/api/$worker/health"
                ;;
        esac

        test_endpoint "Worker: $worker" "$worker_url" 200 15
    done
}

# Performance testing
test_performance() {
    if [[ "$SKIP_LOAD_TEST" == "true" ]]; then
        log_info "Skipping performance tests (load testing disabled)"
        return 0
    fi

    log_info "Running performance tests..."

    local base_url
    case $ENVIRONMENT in
        "production")
            base_url="https://mustbeviral.com"
            ;;
        "staging")
            base_url="https://staging.mustbeviral.com"
            ;;
        *)
            base_url="http://localhost:3000"
            ;;
    esac

    # Test response times
    local endpoints=("/" "/health" "/api/health")

    for endpoint in "${endpoints[@]}"; do
        local url="${base_url}${endpoint}"
        local response_time

        response_time=$(curl -s -o /dev/null -w "%{time_total}" --max-time 10 "$url" 2>/dev/null || echo "timeout")

        if [[ "$response_time" != "timeout" ]] && (( $(echo "$response_time < 2.0" | bc -l) )); then
            log_success "Performance $endpoint: ${response_time}s (Good)"
            PASSED_TESTS+=("Performance: $endpoint")
        elif [[ "$response_time" != "timeout" ]] && (( $(echo "$response_time < 5.0" | bc -l) )); then
            log_warning "Performance $endpoint: ${response_time}s (Acceptable)"
            WARNINGS+=("Performance: $endpoint")
        else
            log_error "Performance $endpoint: ${response_time}s (Poor)"
            FAILED_TESTS+=("Performance: $endpoint")
        fi
    done
}

# Security testing
test_security() {
    log_info "Running security tests..."

    local base_url
    case $ENVIRONMENT in
        "production")
            base_url="https://mustbeviral.com"
            ;;
        "staging")
            base_url="https://staging.mustbeviral.com"
            ;;
        *)
            base_url="http://localhost:3000"
            ;;
    esac

    # Test security headers
    local headers_response
    headers_response=$(curl -s -I "$base_url" 2>/dev/null)

    local required_headers=(
        "X-Frame-Options"
        "X-Content-Type-Options"
        "X-XSS-Protection"
        "Strict-Transport-Security"
        "Content-Security-Policy"
    )

    for header in "${required_headers[@]}"; do
        if echo "$headers_response" | grep -qi "$header"; then
            log_success "Security header present: $header"
            PASSED_TESTS+=("Security Header: $header")
        else
            log_warning "Security header missing: $header"
            WARNINGS+=("Security Header: $header")
        fi
    done

    # Test for common vulnerabilities
    test_endpoint "SQL Injection Test" "${base_url}/api/health?id=1' OR '1'='1" 400 5
    test_endpoint "XSS Test" "${base_url}/api/health?test=<script>alert('xss')</script>" 400 5
}

# Test monitoring endpoints
test_monitoring() {
    log_info "Testing monitoring endpoints..."

    local base_url
    case $ENVIRONMENT in
        "production")
            base_url="https://mustbeviral.com"
            ;;
        "staging")
            base_url="https://staging.mustbeviral.com"
            ;;
        *)
            base_url="http://localhost:3000"
            ;;
    esac

    test_endpoint "Health Check" "${base_url}/health" 200 5
    test_endpoint "Metrics Endpoint" "${base_url}/metrics" 200 10
}

# Load environment configuration
load_environment() {
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

    if [[ -f "$env_file" ]]; then
        export $(grep -v '^#' "$env_file" | xargs) 2>/dev/null || true
        log_info "Environment loaded from $env_file"
    else
        log_warning "Environment file not found: $env_file"
    fi
}

# Generate test report
generate_report() {
    local total_tests=$((${#PASSED_TESTS[@]} + ${#FAILED_TESTS[@]} + ${#WARNINGS[@]}))
    local pass_rate=0

    if [[ $total_tests -gt 0 ]]; then
        pass_rate=$(( (${#PASSED_TESTS[@]} * 100) / total_tests ))
    fi

    echo ""
    echo "================================="
    echo "  DEPLOYMENT VALIDATION REPORT"
    echo "================================="
    echo "Environment: $ENVIRONMENT"
    echo "Timestamp: $(date)"
    echo ""
    echo "📊 Test Summary:"
    echo "  Total Tests: $total_tests"
    echo "  Passed: ${#PASSED_TESTS[@]}"
    echo "  Failed: ${#FAILED_TESTS[@]}"
    echo "  Warnings: ${#WARNINGS[@]}"
    echo "  Pass Rate: ${pass_rate}%"
    echo ""

    if [[ ${#PASSED_TESTS[@]} -gt 0 ]]; then
        echo "✅ Passed Tests:"
        for test in "${PASSED_TESTS[@]}"; do
            echo "  - $test"
        done
        echo ""
    fi

    if [[ ${#WARNINGS[@]} -gt 0 ]]; then
        echo "⚠️  Warnings:"
        for warning in "${WARNINGS[@]}"; do
            echo "  - $warning"
        done
        echo ""
    fi

    if [[ ${#FAILED_TESTS[@]} -gt 0 ]]; then
        echo "❌ Failed Tests:"
        for test in "${FAILED_TESTS[@]}"; do
            echo "  - $test"
        done
        echo ""
    fi

    echo "================================="

    # Save report to file
    local report_file="deployment-validation-${ENVIRONMENT}-$(date +%Y%m%d_%H%M%S).txt"
    {
        echo "Deployment Validation Report"
        echo "Environment: $ENVIRONMENT"
        echo "Timestamp: $(date)"
        echo ""
        echo "Passed Tests: ${#PASSED_TESTS[@]}"
        echo "Failed Tests: ${#FAILED_TESTS[@]}"
        echo "Warnings: ${#WARNINGS[@]}"
        echo "Pass Rate: ${pass_rate}%"
    } > "$report_file"

    log_info "Report saved to: $report_file"

    # Return appropriate exit code
    if [[ ${#FAILED_TESTS[@]} -gt 0 ]]; then
        return 1
    else
        return 0
    fi
}

# Main validation flow
main() {
    log_info "Starting deployment validation for $ENVIRONMENT..."
    log_info "Skip load test: $SKIP_LOAD_TEST"
    log_info "Verbose: $VERBOSE"

    load_environment

    # Run all test suites
    test_monitoring
    test_database
    test_cloudflare_workers
    test_performance
    test_security

    # SSL testing for non-local environments
    if [[ "$ENVIRONMENT" != "development" ]]; then
        case $ENVIRONMENT in
            "production")
                test_ssl "mustbeviral.com"
                ;;
            "staging")
                test_ssl "staging.mustbeviral.com"
                ;;
        esac
    fi

    # Generate and display report
    if generate_report; then
        log_success "🎉 Deployment validation completed successfully!"
        exit 0
    else
        log_error "💥 Deployment validation failed!"
        exit 1
    fi
}

# Handle script interruption
trap 'log_error "Validation interrupted"; exit 1' INT TERM

# Show usage if no arguments provided
if [[ $# -eq 0 ]]; then
    echo "Usage: $0 <environment> [skip-load-test] [verbose]"
    echo "  environment: development, staging, or production"
    echo "  skip-load-test: true or false (default: false)"
    echo "  verbose: true or false (default: false)"
    echo ""
    echo "Examples:"
    echo "  $0 staging"
    echo "  $0 production true false"
    echo "  $0 development false true"
    exit 1
fi

# Validate environment parameter
if [[ ! "$ENVIRONMENT" =~ ^(development|staging|production)$ ]]; then
    log_error "Invalid environment. Use: development, staging, or production"
    exit 1
fi

# Run main function
main "$@"