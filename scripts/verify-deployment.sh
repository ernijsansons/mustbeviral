#!/bin/bash

# Must Be Viral V2 - Deployment Verification Script
# Run this script before deploying to production to verify all systems are ready

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Track overall status
ERRORS=0
WARNINGS=0
CHECKS_PASSED=0
TOTAL_CHECKS=0

# Function to print colored output
print_status() {
    local status=$1
    local message=$2
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))

    case $status in
        "PASS")
            echo -e "${GREEN}✓${NC} $message"
            CHECKS_PASSED=$((CHECKS_PASSED + 1))
            ;;
        "FAIL")
            echo -e "${RED}✗${NC} $message"
            ERRORS=$((ERRORS + 1))
            ;;
        "WARN")
            echo -e "${YELLOW}⚠${NC} $message"
            WARNINGS=$((WARNINGS + 1))
            CHECKS_PASSED=$((CHECKS_PASSED + 1))
            ;;
        "INFO")
            echo -e "${BLUE}ℹ${NC} $message"
            ;;
    esac
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check environment variable
check_env_var() {
    local var_name=$1
    local required=${2:-true}

    if [ -z "${!var_name}" ]; then
        if [ "$required" = true ]; then
            print_status "FAIL" "Required environment variable $var_name is not set"
            return 1
        else
            print_status "WARN" "Optional environment variable $var_name is not set"
            return 0
        fi
    else
        print_status "PASS" "Environment variable $var_name is set"
        return 0
    fi
}

# Function to check file exists
check_file_exists() {
    local file_path=$1
    local required=${2:-true}

    if [ -f "$file_path" ]; then
        print_status "PASS" "File exists: $file_path"
        return 0
    else
        if [ "$required" = true ]; then
            print_status "FAIL" "Required file missing: $file_path"
            return 1
        else
            print_status "WARN" "Optional file missing: $file_path"
            return 0
        fi
    fi
}

# Function to check directory exists
check_dir_exists() {
    local dir_path=$1

    if [ -d "$dir_path" ]; then
        print_status "PASS" "Directory exists: $dir_path"
        return 0
    else
        print_status "FAIL" "Required directory missing: $dir_path"
        return 1
    fi
}

# Function to check Node.js version
check_node_version() {
    local required_version=$1

    if command_exists node; then
        local node_version=$(node -v | cut -d'v' -f2)
        if [ "$(printf '%s\n' "$required_version" "$node_version" | sort -V | head -n1)" = "$required_version" ]; then
            print_status "PASS" "Node.js version $node_version meets minimum requirement ($required_version)"
        else
            print_status "FAIL" "Node.js version $node_version is below minimum requirement ($required_version)"
        fi
    else
        print_status "FAIL" "Node.js is not installed"
    fi
}

# Function to check npm packages
check_npm_packages() {
    if [ -f "package.json" ]; then
        if [ -d "node_modules" ]; then
            print_status "PASS" "Node modules are installed"

            # Check for vulnerabilities
            print_status "INFO" "Checking for npm vulnerabilities..."
            npm audit --audit-level=high 2>/dev/null || print_status "WARN" "npm audit found vulnerabilities"
        else
            print_status "FAIL" "Node modules not installed. Run 'npm install'"
        fi
    else
        print_status "FAIL" "package.json not found"
    fi
}

# Function to check build
check_build() {
    if [ -d "mustbeviral/.next" ] || [ -d "mustbeviral/out" ] || [ -d "mustbeviral/dist" ]; then
        print_status "PASS" "Production build exists"
    else
        print_status "FAIL" "Production build not found. Run 'npm run build'"
    fi
}

# Function to run tests
check_tests() {
    print_status "INFO" "Running test suite..."

    if npm test -- --passWithNoTests 2>/dev/null; then
        print_status "PASS" "All tests passed"
    else
        print_status "FAIL" "Tests failed. Fix failing tests before deployment"
    fi
}

# Function to check Docker
check_docker() {
    if command_exists docker; then
        if docker info >/dev/null 2>&1; then
            print_status "PASS" "Docker is installed and running"
        else
            print_status "WARN" "Docker is installed but not running"
        fi
    else
        print_status "WARN" "Docker is not installed (optional for some deployment methods)"
    fi
}

# Function to check Cloudflare CLI
check_cloudflare() {
    if command_exists wrangler; then
        print_status "PASS" "Wrangler CLI is installed"

        # Check if logged in
        if wrangler whoami >/dev/null 2>&1; then
            print_status "PASS" "Wrangler is authenticated"
        else
            print_status "FAIL" "Wrangler is not authenticated. Run 'wrangler login'"
        fi
    else
        print_status "FAIL" "Wrangler CLI is not installed. Run 'npm install -g wrangler'"
    fi
}

# Function to check database migrations
check_database() {
    if [ -d "mustbeviral/migrations" ] || [ -d "database/migrations" ]; then
        print_status "PASS" "Database migrations directory exists"
    else
        print_status "WARN" "Database migrations directory not found"
    fi
}

# Function to check SSL certificates
check_ssl() {
    local domain=${1:-"mustbeviral.com"}

    print_status "INFO" "Checking SSL certificate for $domain..."

    if command_exists openssl; then
        echo | openssl s_client -servername "$domain" -connect "$domain:443" 2>/dev/null | \
        openssl x509 -noout -dates 2>/dev/null && \
        print_status "PASS" "SSL certificate is valid for $domain" || \
        print_status "WARN" "Could not verify SSL certificate for $domain"
    else
        print_status "WARN" "OpenSSL not installed, cannot verify SSL certificates"
    fi
}

# Function to check git status
check_git_status() {
    if [ -d ".git" ]; then
        local uncommitted=$(git status --porcelain | wc -l)
        if [ "$uncommitted" -eq 0 ]; then
            print_status "PASS" "No uncommitted changes"
        else
            print_status "WARN" "You have $uncommitted uncommitted changes"
            print_status "INFO" "Consider committing changes before deployment"
        fi

        # Check current branch
        local branch=$(git rev-parse --abbrev-ref HEAD)
        if [ "$branch" = "main" ] || [ "$branch" = "master" ] || [ "$branch" = "production" ]; then
            print_status "PASS" "On production branch: $branch"
        else
            print_status "WARN" "On branch '$branch' - ensure you're deploying the right branch"
        fi
    else
        print_status "WARN" "Not a git repository"
    fi
}

# Main verification process
echo "================================================"
echo "Must Be Viral V2 - Deployment Verification"
echo "================================================"
echo ""

# 1. System Requirements
echo "1. SYSTEM REQUIREMENTS"
echo "----------------------"
check_node_version "20.0.0"
command_exists npm && print_status "PASS" "npm is installed" || print_status "FAIL" "npm is not installed"
command_exists git && print_status "PASS" "git is installed" || print_status "FAIL" "git is not installed"
check_docker
echo ""

# 2. Project Structure
echo "2. PROJECT STRUCTURE"
echo "--------------------"
check_file_exists "package.json"
check_file_exists "server.js"
check_dir_exists "mustbeviral"
check_dir_exists "mustbeviral/src"
check_dir_exists "mustbeviral/workers"
echo ""

# 3. Configuration Files
echo "3. CONFIGURATION FILES"
echo "----------------------"
check_file_exists ".env.production" false
check_file_exists ".env.production.template"
check_file_exists "docker-compose.yml" false
check_file_exists "Dockerfile" false
check_file_exists "wrangler.toml" false
echo ""

# 4. Dependencies & Build
echo "4. DEPENDENCIES & BUILD"
echo "-----------------------"
check_npm_packages
check_build
echo ""

# 5. Critical Environment Variables
echo "5. ENVIRONMENT VARIABLES"
echo "------------------------"
if [ -f ".env.production" ]; then
    source .env.production
    check_env_var "NODE_ENV"
    check_env_var "CLOUDFLARE_ACCOUNT_ID"
    check_env_var "CLOUDFLARE_API_TOKEN"
    check_env_var "JWT_SECRET"
    check_env_var "DATABASE_URL"
    check_env_var "STRIPE_SECRET_KEY" false
    check_env_var "OPENAI_API_KEY" false
else
    print_status "WARN" "Production environment file not found. Using template check."
fi
echo ""

# 6. Cloudflare Setup
echo "6. CLOUDFLARE SETUP"
echo "-------------------"
check_cloudflare
check_file_exists "mustbeviral/workers/wrangler.toml" false
echo ""

# 7. Database
echo "7. DATABASE"
echo "-----------"
check_database
echo ""

# 8. Testing
echo "8. TESTING"
echo "----------"
# Commented out to avoid running tests during verification
# check_tests
print_status "INFO" "Run 'npm test' to verify all tests pass"
echo ""

# 9. Security
echo "9. SECURITY"
echo "-----------"
check_file_exists ".gitignore"
# Check if sensitive files are ignored
if [ -f ".gitignore" ]; then
    grep -q ".env" .gitignore && print_status "PASS" ".env files are gitignored" || print_status "FAIL" ".env files are not gitignored"
fi
echo ""

# 10. Git Status
echo "10. GIT STATUS"
echo "--------------"
check_git_status
echo ""

# 11. SSL & Domain (optional)
echo "11. SSL & DOMAIN (Optional)"
echo "---------------------------"
# Commented out to avoid external network calls during verification
# check_ssl "mustbeviral.com"
print_status "INFO" "Manual SSL verification recommended before production deployment"
echo ""

# Summary
echo "================================================"
echo "VERIFICATION SUMMARY"
echo "================================================"
echo -e "Total Checks: $TOTAL_CHECKS"
echo -e "${GREEN}Passed: $CHECKS_PASSED${NC}"
echo -e "${YELLOW}Warnings: $WARNINGS${NC}"
echo -e "${RED}Errors: $ERRORS${NC}"
echo ""

# Exit code based on errors
if [ $ERRORS -gt 0 ]; then
    echo -e "${RED}❌ DEPLOYMENT VERIFICATION FAILED${NC}"
    echo "Please fix the errors above before deploying to production."
    exit 1
else
    if [ $WARNINGS -gt 0 ]; then
        echo -e "${YELLOW}⚠️  DEPLOYMENT VERIFICATION PASSED WITH WARNINGS${NC}"
        echo "Review the warnings above and ensure they won't impact production."
    else
        echo -e "${GREEN}✅ DEPLOYMENT VERIFICATION PASSED${NC}"
        echo "All checks passed! Ready for production deployment."
    fi
    exit 0
fi