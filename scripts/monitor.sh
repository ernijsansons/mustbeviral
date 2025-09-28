#!/bin/bash

# Enterprise Monitoring Script for Must Be Viral V2
# This script provides comprehensive monitoring and alerting

set -euo pipefail

# Configuration
COMPOSE_FILE="docker-compose.yml"
ALERT_EMAIL=${ALERT_EMAIL:-admin@mustbeviral.com}
LOG_FILE="./monitoring.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1" | tee -a "$LOG_FILE"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$LOG_FILE"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
}

# Check service health
check_service_health() {
    local service=$1
    local port=$2
    
    if curl -f "http://localhost:$port/health" > /dev/null 2>&1; then
        log_success "$service is healthy"
        return 0
    else
        log_error "$service is unhealthy"
        return 1
    fi
}

# Check container status
check_container_status() {
    log_info "Checking container status..."
    
    local unhealthy_containers=()
    
    while IFS= read -r line; do
        if [[ $line == *"unhealthy"* ]] || [[ $line == *"Exited"* ]]; then
            unhealthy_containers+=("$line")
        fi
    done < <(docker-compose ps)
    
    if [ ${#unhealthy_containers[@]} -gt 0 ]; then
        log_error "Unhealthy containers detected:"
        printf '%s\n' "${unhealthy_containers[@]}"
        return 1
    else
        log_success "All containers are healthy"
        return 0
    fi
}

# Check resource usage
check_resource_usage() {
    log_info "Checking resource usage..."
    
    # Check memory usage
    local memory_usage=$(docker stats --no-stream --format "table {{.MemPerc}}" | tail -n +2 | sed 's/%//' | awk '{sum+=$1} END {print sum}')
    
    if (( $(echo "$memory_usage > 80" | bc -l) )); then
        log_warning "High memory usage detected: ${memory_usage}%"
    else
        log_success "Memory usage is normal: ${memory_usage}%"
    fi
    
    # Check disk usage
    local disk_usage=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
    
    if [ "$disk_usage" -gt 80 ]; then
        log_warning "High disk usage detected: ${disk_usage}%"
    else
        log_success "Disk usage is normal: ${disk_usage}%"
    fi
}

# Check database performance
check_database_performance() {
    log_info "Checking database performance..."
    
    # Check active connections
    local active_connections=$(docker-compose exec -T postgres psql -U postgres -d mustbeviral -t -c "SELECT count(*) FROM pg_stat_activity WHERE state = 'active';" 2>/dev/null | tr -d ' ')
    
    if [ "$active_connections" -gt 50 ]; then
        log_warning "High number of active database connections: $active_connections"
    else
        log_success "Database connections are normal: $active_connections"
    fi
    
    # Check slow queries
    local slow_queries=$(docker-compose exec -T postgres psql -U postgres -d mustbeviral -t -c "SELECT count(*) FROM pg_stat_statements WHERE mean_time > 1000;" 2>/dev/null | tr -d ' ')
    
    if [ "$slow_queries" -gt 10 ]; then
        log_warning "Slow queries detected: $slow_queries"
    else
        log_success "Query performance is normal"
    fi
}

# Check application metrics
check_application_metrics() {
    log_info "Checking application metrics..."
    
    # Get metrics from Prometheus endpoint
    local metrics=$(curl -s http://localhost:3000/metrics 2>/dev/null || echo "")
    
    if [ -z "$metrics" ]; then
        log_error "Failed to retrieve application metrics"
        return 1
    fi
    
    # Parse memory usage
    local memory_used=$(echo "$metrics" | grep "nodejs_memory_usage_bytes{type=\"heapUsed\"}" | awk '{print $2}')
    local memory_total=$(echo "$metrics" | grep "nodejs_memory_usage_bytes{type=\"heapTotal\"}" | awk '{print $2}')
    
    if [ -n "$memory_used" ] && [ -n "$memory_total" ]; then
        local memory_percent=$(echo "scale=2; $memory_used * 100 / $memory_total" | bc)
        
        if (( $(echo "$memory_percent > 80" | bc -l) )); then
            log_warning "High application memory usage: ${memory_percent}%"
        else
            log_success "Application memory usage is normal: ${memory_percent}%"
        fi
    fi
}

# Send alert
send_alert() {
    local message=$1
    local severity=${2:-WARNING}
    
    log_error "ALERT [$severity]: $message"
    
    # Send email alert (requires mail command)
    if command -v mail &> /dev/null; then
        echo "$message" | mail -s "[$severity] Must Be Viral V2 Alert" "$ALERT_EMAIL"
    fi
    
    # Send webhook notification (if configured)
    if [ -n "${WEBHOOK_URL:-}" ]; then
        curl -X POST "$WEBHOOK_URL" \
            -H "Content-Type: application/json" \
            -d "{\"text\":\"[$severity] Must Be Viral V2: $message\"}" 2>/dev/null || true
    fi
}

# Generate monitoring report
generate_report() {
    log_info "Generating monitoring report..."
    
    local report_file="./monitoring-report-$(date +%Y%m%d-%H%M%S).txt"
    
    {
        echo "=== Must Be Viral V2 Monitoring Report ==="
        echo "Generated: $(date)"
        echo ""
        
        echo "=== Container Status ==="
        docker-compose ps
        echo ""
        
        echo "=== Resource Usage ==="
        docker stats --no-stream
        echo ""
        
        echo "=== Disk Usage ==="
        df -h
        echo ""
        
        echo "=== Application Health ==="
        curl -s http://localhost:3000/health | jq . 2>/dev/null || echo "Health endpoint not available"
        echo ""
        
        echo "=== Database Status ==="
        docker-compose exec -T postgres psql -U postgres -d mustbeviral -c "SELECT version();" 2>/dev/null || echo "Database not accessible"
        echo ""
        
    } > "$report_file"
    
    log_success "Monitoring report generated: $report_file"
}

# Main monitoring function
main() {
    local action=${1:-check}
    
    case "$action" in
        "check")
            log_info "Starting comprehensive health check..."
            
            local failed_checks=0
            
            check_container_status || ((failed_checks++))
            check_service_health "Application" 3000 || ((failed_checks++))
            check_service_health "Grafana" 3001 || ((failed_checks++))
            check_service_health "Prometheus" 9090 || ((failed_checks++))
            check_service_health "Kibana" 5601 || ((failed_checks++))
            check_resource_usage || ((failed_checks++))
            check_database_performance || ((failed_checks++))
            check_application_metrics || ((failed_checks++))
            
            if [ $failed_checks -gt 0 ]; then
                send_alert "$failed_checks health checks failed" "CRITICAL"
                exit 1
            else
                log_success "All health checks passed"
            fi
            ;;
        "report")
            generate_report
            ;;
        "alerts")
            log_info "Checking for alerts..."
            # Add custom alert logic here
            ;;
        *)
            echo "Usage: $0 {check|report|alerts}"
            exit 1
            ;;
    esac
}

# Run main function
main "$@"











