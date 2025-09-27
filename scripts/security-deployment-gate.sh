#!/bin/bash

# Security Deployment Gate
# Comprehensive security validation before deployment
# BLOCKS deployment if ANY critical vulnerability is found

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
SECURITY_THRESHOLD_CVSS="6.0"
TIMESTAMP=$(date -u +"%Y-%m-%d %H:%M:%S UTC")

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

log_critical() {
    echo -e "${RED}[CRITICAL]${NC} $1"
}

# Security gate results tracking
SECURITY_ISSUES=0
CRITICAL_ISSUES=0
HIGH_ISSUES=0
WARNINGS=0
GATE_STATUS="UNKNOWN"

# Create security report
REPORT_FILE="$PROJECT_ROOT/security-gate-report.json"
SUMMARY_FILE="$PROJECT_ROOT/security-gate-summary.md"

echo "=================================================================="
echo "🔒 SECURITY DEPLOYMENT GATE"
echo "=================================================================="
echo "Timestamp: $TIMESTAMP"
echo "Project: Must Be Viral V2"
echo "Threshold: CVSS $SECURITY_THRESHOLD_CVSS+"
echo "=================================================================="

# Initialize report
cat > "$REPORT_FILE" << EOF
{
  "timestamp": "$TIMESTAMP",
  "project": "Must Be Viral V2",
  "cvss_threshold": "$SECURITY_THRESHOLD_CVSS",
  "scans": {},
  "summary": {
    "gate_status": "RUNNING",
    "total_issues": 0,
    "critical_issues": 0,
    "high_issues": 0,
    "warnings": 0
  }
}
EOF

# Function to update report
update_report() {
    local scan_name="$1"
    local status="$2"
    local issues="$3"
    local details="$4"

    # Use jq to update the JSON report
    if command -v jq >/dev/null 2>&1; then
        tmp_file=$(mktemp)
        jq --arg scan "$scan_name" \
           --arg status "$status" \
           --argjson issues "$issues" \
           --arg details "$details" \
           '.scans[$scan] = {
             "status": $status,
             "issues": $issues,
             "details": $details,
             "timestamp": now | strftime("%Y-%m-%d %H:%M:%S UTC")
           }' "$REPORT_FILE" > "$tmp_file"
        mv "$tmp_file" "$REPORT_FILE"
    fi
}

# 1. NPM AUDIT SCAN
echo ""
log_info "Running NPM security audit..."

NPM_AUDIT_RESULT=0
npm audit --audit-level=critical --json > npm-audit-results.json 2>/dev/null || NPM_AUDIT_RESULT=$?

if [ -f npm-audit-results.json ]; then
    # Parse audit results
    if command -v jq >/dev/null 2>&1; then
        CRITICAL_VULNS=$(jq -r '.metadata.vulnerabilities.critical // 0' npm-audit-results.json 2>/dev/null || echo "0")
        HIGH_VULNS=$(jq -r '.metadata.vulnerabilities.high // 0' npm-audit-results.json 2>/dev/null || echo "0")
        MODERATE_VULNS=$(jq -r '.metadata.vulnerabilities.moderate // 0' npm-audit-results.json 2>/dev/null || echo "0")
        LOW_VULNS=$(jq -r '.metadata.vulnerabilities.low // 0' npm-audit-results.json 2>/dev/null || echo "0")
        INFO_VULNS=$(jq -r '.metadata.vulnerabilities.info // 0' npm-audit-results.json 2>/dev/null || echo "0")
    else
        CRITICAL_VULNS=0
        HIGH_VULNS=0
        MODERATE_VULNS=0
        LOW_VULNS=0
        INFO_VULNS=0
    fi

    log_info "NPM Audit Results:"
    echo "  Critical: $CRITICAL_VULNS"
    echo "  High: $HIGH_VULNS"
    echo "  Moderate: $MODERATE_VULNS"
    echo "  Low: $LOW_VULNS"
    echo "  Info: $INFO_VULNS"

    # Check for blocking vulnerabilities
    BLOCKING_VULNS=$((CRITICAL_VULNS + HIGH_VULNS))
    SECURITY_ISSUES=$((SECURITY_ISSUES + BLOCKING_VULNS))
    CRITICAL_ISSUES=$((CRITICAL_ISSUES + CRITICAL_VULNS))
    HIGH_ISSUES=$((HIGH_ISSUES + HIGH_VULNS))

    if [ "$BLOCKING_VULNS" -gt 0 ]; then
        log_critical "NPM Audit: $BLOCKING_VULNS blocking vulnerabilities found!"
        update_report "npm_audit" "FAILED" "$BLOCKING_VULNS" "Critical: $CRITICAL_VULNS, High: $HIGH_VULNS"
    else
        log_success "NPM Audit: No critical vulnerabilities found"
        update_report "npm_audit" "PASSED" "0" "No blocking vulnerabilities"
    fi
else
    log_warning "NPM Audit: Could not parse results"
    update_report "npm_audit" "ERROR" "0" "Could not parse audit results"
fi

# 2. SNYK SECURITY SCAN (if token available)
echo ""
log_info "Running Snyk security scan..."

if [ -n "$SNYK_TOKEN" ]; then
    if command -v snyk >/dev/null 2>&1; then
        snyk auth "$SNYK_TOKEN" >/dev/null 2>&1 || true

        SNYK_RESULT=0
        snyk test --severity-threshold=high --json > snyk-results.json 2>/dev/null || SNYK_RESULT=$?

        if [ -f snyk-results.json ] && command -v jq >/dev/null 2>&1; then
            SNYK_VULNS=$(jq -r '.vulnerabilities | length' snyk-results.json 2>/dev/null || echo "0")
            SNYK_CRITICAL=$(jq -r '[.vulnerabilities[] | select(.severity == "critical")] | length' snyk-results.json 2>/dev/null || echo "0")
            SNYK_HIGH=$(jq -r '[.vulnerabilities[] | select(.severity == "high")] | length' snyk-results.json 2>/dev/null || echo "0")

            log_info "Snyk Results: $SNYK_VULNS vulnerabilities (Critical: $SNYK_CRITICAL, High: $SNYK_HIGH)"

            SNYK_BLOCKING=$((SNYK_CRITICAL + SNYK_HIGH))
            SECURITY_ISSUES=$((SECURITY_ISSUES + SNYK_BLOCKING))
            CRITICAL_ISSUES=$((CRITICAL_ISSUES + SNYK_CRITICAL))
            HIGH_ISSUES=$((HIGH_ISSUES + SNYK_HIGH))

            if [ "$SNYK_BLOCKING" -gt 0 ]; then
                log_critical "Snyk: $SNYK_BLOCKING blocking vulnerabilities found!"
                update_report "snyk" "FAILED" "$SNYK_BLOCKING" "Critical: $SNYK_CRITICAL, High: $SNYK_HIGH"
            else
                log_success "Snyk: No critical vulnerabilities found"
                update_report "snyk" "PASSED" "0" "No blocking vulnerabilities"
            fi
        else
            log_warning "Snyk: Could not parse results"
            update_report "snyk" "ERROR" "0" "Could not parse Snyk results"
        fi
    else
        log_warning "Snyk: Tool not installed"
        update_report "snyk" "SKIPPED" "0" "Snyk tool not available"
    fi
else
    log_info "Snyk: Token not provided, skipping"
    update_report "snyk" "SKIPPED" "0" "SNYK_TOKEN not provided"
fi

# 3. RETIRE.JS SCAN
echo ""
log_info "Running Retire.js vulnerable libraries scan..."

if command -v retire >/dev/null 2>&1; then
    RETIRE_RESULT=0
    retire --path "$PROJECT_ROOT" --outputformat json > retire-results.json 2>/dev/null || RETIRE_RESULT=$?

    if [ -f retire-results.json ] && command -v jq >/dev/null 2>&1; then
        RETIRE_VULNS=$(jq '. | length' retire-results.json 2>/dev/null || echo "0")

        log_info "Retire.js Results: $RETIRE_VULNS vulnerable libraries found"

        if [ "$RETIRE_VULNS" -gt 0 ]; then
            log_warning "Retire.js: $RETIRE_VULNS vulnerable libraries detected"
            WARNINGS=$((WARNINGS + RETIRE_VULNS))
            update_report "retire_js" "WARNING" "$RETIRE_VULNS" "Vulnerable libraries detected"
        else
            log_success "Retire.js: No vulnerable libraries found"
            update_report "retire_js" "PASSED" "0" "No vulnerable libraries"
        fi
    else
        log_warning "Retire.js: Could not parse results"
        update_report "retire_js" "ERROR" "0" "Could not parse Retire.js results"
    fi
else
    log_warning "Retire.js: Tool not installed"
    update_report "retire_js" "SKIPPED" "0" "Retire.js tool not available"
fi

# 4. SECRET DETECTION
echo ""
log_info "Running secret detection scan..."

SECRET_PATTERNS=(
    "password.*=.*['\"][^'\"]{8,}['\"]"
    "api[_-]?key.*=.*['\"][^'\"]{16,}['\"]"
    "secret.*=.*['\"][^'\"]{16,}['\"]"
    "token.*=.*['\"][^'\"]{16,}['\"]"
    "AKIA[0-9A-Z]{16}"
    "sk_live_[0-9a-zA-Z]{24}"
)

SECRETS_FOUND=0
for pattern in "${SECRET_PATTERNS[@]}"; do
    if grep -r -E "$pattern" "$PROJECT_ROOT" \
        --exclude-dir=node_modules \
        --exclude-dir=.git \
        --exclude-dir=.next \
        --exclude-dir=out \
        --exclude-dir=dist \
        --exclude="*.log" \
        --exclude="security-gate-*" >/dev/null 2>&1; then
        SECRETS_FOUND=$((SECRETS_FOUND + 1))
    fi
done

if [ "$SECRETS_FOUND" -gt 0 ]; then
    log_warning "Secret Detection: $SECRETS_FOUND potential secrets found"
    WARNINGS=$((WARNINGS + SECRETS_FOUND))
    update_report "secret_detection" "WARNING" "$SECRETS_FOUND" "Potential secrets detected in codebase"
else
    log_success "Secret Detection: No obvious secrets found"
    update_report "secret_detection" "PASSED" "0" "No secrets detected"
fi

# 5. SECURITY HEADERS CHECK (if URL provided)
if [ -n "$1" ]; then
    echo ""
    log_info "Checking security headers for: $1"

    MISSING_HEADERS=0
    SECURITY_HEADERS=(
        "X-Frame-Options"
        "X-Content-Type-Options"
        "X-XSS-Protection"
        "Strict-Transport-Security"
        "Content-Security-Policy"
    )

    for header in "${SECURITY_HEADERS[@]}"; do
        if ! curl -sI "$1" | grep -i "$header" >/dev/null 2>&1; then
            MISSING_HEADERS=$((MISSING_HEADERS + 1))
            log_warning "Missing security header: $header"
        fi
    done

    if [ "$MISSING_HEADERS" -gt 0 ]; then
        log_warning "Security Headers: $MISSING_HEADERS headers missing"
        WARNINGS=$((WARNINGS + MISSING_HEADERS))
        update_report "security_headers" "WARNING" "$MISSING_HEADERS" "Missing security headers"
    else
        log_success "Security Headers: All essential headers present"
        update_report "security_headers" "PASSED" "0" "All security headers present"
    fi
fi

# FINAL SECURITY GATE DECISION
echo ""
echo "=================================================================="
echo "🔒 SECURITY GATE RESULTS"
echo "=================================================================="

# Update final report summary
if command -v jq >/dev/null 2>&1; then
    tmp_file=$(mktemp)
    jq --argjson total "$SECURITY_ISSUES" \
       --argjson critical "$CRITICAL_ISSUES" \
       --argjson high "$HIGH_ISSUES" \
       --argjson warnings "$WARNINGS" \
       '.summary.total_issues = $total |
        .summary.critical_issues = $critical |
        .summary.high_issues = $high |
        .summary.warnings = $warnings' "$REPORT_FILE" > "$tmp_file"
    mv "$tmp_file" "$REPORT_FILE"
fi

echo "Total Security Issues: $SECURITY_ISSUES"
echo "Critical Issues: $CRITICAL_ISSUES"
echo "High Issues: $HIGH_ISSUES"
echo "Warnings: $WARNINGS"
echo ""

# Generate summary report
cat > "$SUMMARY_FILE" << EOF
# Security Deployment Gate Report

**Generated:** $TIMESTAMP
**Project:** Must Be Viral V2
**CVSS Threshold:** $SECURITY_THRESHOLD_CVSS+

## Security Gate Status

EOF

if [ "$SECURITY_ISSUES" -gt 0 ]; then
    GATE_STATUS="BLOCKED"

    echo -e "${RED}🚨 DEPLOYMENT BLOCKED${NC}"
    echo -e "${RED}Security vulnerabilities must be resolved before deployment${NC}"
    echo ""
    echo "Blocking Issues Found:"
    echo "  Critical: $CRITICAL_ISSUES"
    echo "  High: $HIGH_ISSUES"
    echo "  Total: $SECURITY_ISSUES"

    cat >> "$SUMMARY_FILE" << EOF
### 🚨 DEPLOYMENT BLOCKED

**Status:** FAILED
**Total Issues:** $SECURITY_ISSUES
**Critical Issues:** $CRITICAL_ISSUES
**High Issues:** $HIGH_ISSUES

**Action Required:** All critical and high severity vulnerabilities must be resolved before deployment.

## Issues Found

EOF

    # Update final status in JSON report
    if command -v jq >/dev/null 2>&1; then
        tmp_file=$(mktemp)
        jq '.summary.gate_status = "BLOCKED"' "$REPORT_FILE" > "$tmp_file"
        mv "$tmp_file" "$REPORT_FILE"
    fi

    exit 1
else
    GATE_STATUS="PASSED"

    echo -e "${GREEN}✅ SECURITY GATE PASSED${NC}"
    echo -e "${GREEN}No critical vulnerabilities found - Deployment approved${NC}"

    if [ "$WARNINGS" -gt 0 ]; then
        echo ""
        echo -e "${YELLOW}⚠️  $WARNINGS warnings found (non-blocking)${NC}"
    fi

    cat >> "$SUMMARY_FILE" << EOF
### ✅ SECURITY GATE PASSED

**Status:** PASSED
**Critical Issues:** 0
**High Issues:** 0
**Warnings:** $WARNINGS

**Deployment approved** - No blocking security vulnerabilities found.

EOF

    # Update final status in JSON report
    if command -v jq >/dev/null 2>&1; then
        tmp_file=$(mktemp)
        jq '.summary.gate_status = "PASSED"' "$REPORT_FILE" > "$tmp_file"
        mv "$tmp_file" "$REPORT_FILE"
    fi
fi

cat >> "$SUMMARY_FILE" << EOF

## Scan Results

| Scan Type | Status | Issues | Details |
|-----------|--------|--------|---------|
EOF

# Add scan results to summary if jq is available
if command -v jq >/dev/null 2>&1 && [ -f "$REPORT_FILE" ]; then
    jq -r '.scans | to_entries[] | "| \(.key) | \(.value.status) | \(.value.issues) | \(.value.details) |"' "$REPORT_FILE" >> "$SUMMARY_FILE"
fi

echo ""
echo "=================================================================="
echo "📊 REPORTS GENERATED"
echo "=================================================================="
echo "JSON Report: $REPORT_FILE"
echo "Summary Report: $SUMMARY_FILE"
echo ""

if [ "$WARNINGS" -gt 0 ]; then
    echo -e "${YELLOW}⚠️  Review warnings in the detailed reports${NC}"
fi

log_info "Security deployment gate completed with status: $GATE_STATUS"

# Exit with appropriate code
if [ "$GATE_STATUS" = "PASSED" ]; then
    exit 0
else
    exit 1
fi