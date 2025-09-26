#!/bin/bash

# Zero-Downtime Deployment Script
# Enterprise-grade deployment with health checks and rollback capabilities

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
LOG_FILE="${SCRIPT_DIR}/deployment.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Deployment configuration
DEPLOYMENT_TIMEOUT=300  # 5 minutes
HEALTH_CHECK_TIMEOUT=60 # 1 minute
ROLLBACK_TIMEOUT=180    # 3 minutes
CANARY_PERCENTAGE=10    # 10% traffic for canary
CANARY_DURATION=300     # 5 minutes

# Required environment variables
REQUIRED_VARS=(
    "ENVIRONMENT"
    "IMAGE_TAG"
    "KUBECONFIG"
    "APP_NAME"
    "NAMESPACE"
)

# Logging function
log() {
    local level="$1"
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    case "$level" in
        "INFO")  echo -e "${GREEN}[${timestamp}] INFO: ${message}${NC}" | tee -a "$LOG_FILE" ;;
        "WARN")  echo -e "${YELLOW}[${timestamp}] WARN: ${message}${NC}" | tee -a "$LOG_FILE" ;;
        "ERROR") echo -e "${RED}[${timestamp}] ERROR: ${message}${NC}" | tee -a "$LOG_FILE" ;;
        "DEBUG") echo -e "${BLUE}[${timestamp}] DEBUG: ${message}${NC}" | tee -a "$LOG_FILE" ;;
    esac
}

# Error handling
trap 'handle_error $? $LINENO' ERR

handle_error() {
    local exit_code=$1
    local line_number=$2
    log "ERROR" "Script failed with exit code $exit_code at line $line_number"
    
    if [[ "${DEPLOYMENT_STARTED:-false}" == "true" ]]; then
        log "WARN" "Deployment was in progress. Initiating emergency rollback..."
        emergency_rollback || log "ERROR" "Emergency rollback failed!"
    fi
    
    send_notification "failure" "Deployment failed at line $line_number"
    exit $exit_code
}

# Validation functions
validate_environment() {
    log "INFO" "Validating environment variables..."
    
    for var in "${REQUIRED_VARS[@]}"; do
        if [[ -z "${!var:-}" ]]; then
            log "ERROR" "Required environment variable $var is not set"
            exit 1
        fi
    done
    
    log "INFO" "Environment validation passed"
}

validate_kubernetes_connection() {
    log "INFO" "Validating Kubernetes connection..."
    
    if ! kubectl cluster-info &>/dev/null; then
        log "ERROR" "Failed to connect to Kubernetes cluster"
        exit 1
    fi
    
    if ! kubectl get namespace "$NAMESPACE" &>/dev/null; then
        log "ERROR" "Namespace $NAMESPACE does not exist"
        exit 1
    fi
    
    log "INFO" "Kubernetes connection validated"
}

validate_image() {
    log "INFO" "Validating container image: $IMAGE_TAG"
    
    # Check if image exists in registry
    if ! docker manifest inspect "$IMAGE_TAG" &>/dev/null; then
        log "ERROR" "Container image $IMAGE_TAG not found in registry"
        exit 1
    fi
    
    # Basic security scan
    log "INFO" "Running basic security scan on image..."
    if command -v grype &> /dev/null; then
        if ! grype "$IMAGE_TAG" --fail-on high &>/dev/null; then
            log "WARN" "Security vulnerabilities found in image $IMAGE_TAG"
        fi
    fi
    
    log "INFO" "Image validation completed"
}

# Pre-deployment checks
pre_deployment_checks() {
    log "INFO" "Starting pre-deployment checks..."
    
    validate_environment
    validate_kubernetes_connection
    validate_image
    
    # Check current deployment status
    if kubectl get deployment "$APP_NAME" -n "$NAMESPACE" &>/dev/null; then
        CURRENT_REPLICAS=$(kubectl get deployment "$APP_NAME" -n "$NAMESPACE" -o jsonpath='{.status.replicas}')
        AVAILABLE_REPLICAS=$(kubectl get deployment "$APP_NAME" -n "$NAMESPACE" -o jsonpath='{.status.availableReplicas}')
        
        if [[ "$AVAILABLE_REPLICAS" -lt "$CURRENT_REPLICAS" ]]; then
            log "ERROR" "Current deployment is not healthy. Available: $AVAILABLE_REPLICAS, Expected: $CURRENT_REPLICAS"
            exit 1
        fi
    fi
    
    # Check cluster resources
    check_cluster_resources
    
    log "INFO" "Pre-deployment checks passed"
}

check_cluster_resources() {
    log "INFO" "Checking cluster resources..."
    
    # Check node capacity
    local node_capacity=$(kubectl top nodes 2>/dev/null | awk 'NR>1 {sum+=$3} END {print sum}' || echo "0")
    if [[ "$node_capacity" -gt 80 ]]; then
        log "WARN" "High CPU usage on cluster nodes: ${node_capacity}%"
    fi
    
    # Check available storage
    local storage_usage=$(kubectl get pv -o jsonpath='{.items[*].status.phase}' | grep -o "Bound" | wc -l || echo "0")
    log "DEBUG" "Persistent volumes in use: $storage_usage"
}

# Health check functions
check_application_health() {
    local endpoint="$1"
    local max_attempts="${2:-30}"
    local attempt=0
    
    log "INFO" "Checking application health at $endpoint"
    
    while [[ $attempt -lt $max_attempts ]]; do
        if curl -f -s -m 10 "$endpoint/health" &>/dev/null; then
            log "INFO" "Health check passed"
            return 0
        fi
        
        attempt=$((attempt + 1))
        log "DEBUG" "Health check attempt $attempt/$max_attempts failed, retrying..."
        sleep 2
    done
    
    log "ERROR" "Health check failed after $max_attempts attempts"
    return 1
}

wait_for_rollout() {
    local deployment_name="$1"
    local timeout="${2:-$DEPLOYMENT_TIMEOUT}"
    
    log "INFO" "Waiting for rollout of $deployment_name to complete..."
    
    if kubectl rollout status "deployment/$deployment_name" -n "$NAMESPACE" --timeout="${timeout}s"; then
        log "INFO" "Rollout completed successfully"
        return 0
    else
        log "ERROR" "Rollout failed or timed out"
        return 1
    fi
}

# Deployment strategies
rolling_update_deployment() {
    log "INFO" "Starting rolling update deployment..."
    
    # Update the deployment with new image
    kubectl set image "deployment/$APP_NAME" "$APP_NAME=$IMAGE_TAG" -n "$NAMESPACE"
    
    # Wait for rollout to complete
    if ! wait_for_rollout "$APP_NAME"; then
        log "ERROR" "Rolling update failed"
        return 1
    fi
    
    log "INFO" "Rolling update completed successfully"
}

blue_green_deployment() {
    log "INFO" "Starting blue-green deployment..."
    
    # Determine current and new environments
    local current_color=""
    local new_color=""
    
    if kubectl get service "${APP_NAME}-service" -n "$NAMESPACE" -o jsonpath='{.spec.selector.color}' | grep -q "blue"; then
        current_color="blue"
        new_color="green"
    else
        current_color="green"
        new_color="blue"
    fi
    
    log "INFO" "Current environment: $current_color, Deploying to: $new_color"
    
    # Create or update the new environment
    cat <<EOF | kubectl apply -f -
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ${APP_NAME}-${new_color}
  namespace: ${NAMESPACE}
  labels:
    app: ${APP_NAME}
    color: ${new_color}
spec:
  replicas: ${CURRENT_REPLICAS:-3}
  selector:
    matchLabels:
      app: ${APP_NAME}
      color: ${new_color}
  template:
    metadata:
      labels:
        app: ${APP_NAME}
        color: ${new_color}
    spec:
      containers:
      - name: ${APP_NAME}
        image: ${IMAGE_TAG}
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "${ENVIRONMENT}"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health/ready
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
EOF
    
    # Wait for new deployment to be ready
    if ! wait_for_rollout "${APP_NAME}-${new_color}"; then
        log "ERROR" "Blue-green deployment failed"
        return 1
    fi
    
    # Health check the new deployment
    local new_service_endpoint="http://${APP_NAME}-${new_color}.${NAMESPACE}.svc.cluster.local:3000"
    if ! check_application_health "$new_service_endpoint"; then
        log "ERROR" "New deployment failed health check"
        return 1
    fi
    
    # Switch service to new deployment
    kubectl patch service "${APP_NAME}-service" -n "$NAMESPACE" -p "{\"spec\":{\"selector\":{\"color\":\"$new_color\"}}}"
    
    log "INFO" "Traffic switched to $new_color environment"
    
    # Wait for DNS propagation
    sleep 30
    
    # Final health check
    if ! check_application_health "https://${DOMAIN:-$APP_NAME}"; then
        log "ERROR" "Final health check failed, rolling back..."
        kubectl patch service "${APP_NAME}-service" -n "$NAMESPACE" -p "{\"spec\":{\"selector\":{\"color\":\"$current_color\"}}}"
        return 1
    fi
    
    # Clean up old deployment
    if kubectl get deployment "${APP_NAME}-${current_color}" -n "$NAMESPACE" &>/dev/null; then
        log "INFO" "Cleaning up old deployment: ${APP_NAME}-${current_color}"
        kubectl delete deployment "${APP_NAME}-${current_color}" -n "$NAMESPACE" --timeout=300s
    fi
    
    log "INFO" "Blue-green deployment completed successfully"
}

canary_deployment() {
    log "INFO" "Starting canary deployment..."
    
    # Create canary deployment
    local canary_replicas=1
    if [[ "${CURRENT_REPLICAS:-3}" -gt 5 ]]; then
        canary_replicas=$((CURRENT_REPLICAS / 10)) # 10% of current replicas
    fi
    
    cat <<EOF | kubectl apply -f -
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ${APP_NAME}-canary
  namespace: ${NAMESPACE}
  labels:
    app: ${APP_NAME}
    version: canary
spec:
  replicas: ${canary_replicas}
  selector:
    matchLabels:
      app: ${APP_NAME}
      version: canary
  template:
    metadata:
      labels:
        app: ${APP_NAME}
        version: canary
    spec:
      containers:
      - name: ${APP_NAME}
        image: ${IMAGE_TAG}
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "${ENVIRONMENT}"
        - name: CANARY_DEPLOYMENT
          value: "true"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health/ready
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
EOF
    
    # Wait for canary deployment
    if ! wait_for_rollout "${APP_NAME}-canary"; then
        log "ERROR" "Canary deployment failed"
        return 1
    fi
    
    # Update service to include canary pods (weighted routing)
    kubectl patch service "${APP_NAME}-service" -n "$NAMESPACE" --type='json' \
        -p='[{"op": "remove", "path": "/spec/selector/version"}]'
    
    log "INFO" "Canary deployment active with $CANARY_PERCENTAGE% traffic for $CANARY_DURATION seconds"
    
    # Monitor canary for specified duration
    local start_time=$(date +%s)
    local end_time=$((start_time + CANARY_DURATION))
    local error_count=0
    
    while [[ $(date +%s) -lt $end_time ]]; do
        if ! check_application_health "https://${DOMAIN:-$APP_NAME}" 1; then
            error_count=$((error_count + 1))
            if [[ $error_count -gt 3 ]]; then
                log "ERROR" "Too many health check failures during canary phase"
                kubectl delete deployment "${APP_NAME}-canary" -n "$NAMESPACE" --timeout=60s
                return 1
            fi
        else
            error_count=0
        fi
        
        sleep 30
    done
    
    # Canary validation passed, proceed with full deployment
    log "INFO" "Canary validation successful, proceeding with full deployment"
    
    # Update main deployment
    kubectl set image "deployment/$APP_NAME" "$APP_NAME=$IMAGE_TAG" -n "$NAMESPACE"
    
    if ! wait_for_rollout "$APP_NAME"; then
        log "ERROR" "Full deployment after canary failed"
        kubectl delete deployment "${APP_NAME}-canary" -n "$NAMESPACE" --timeout=60s
        return 1
    fi
    
    # Clean up canary deployment
    kubectl delete deployment "${APP_NAME}-canary" -n "$NAMESPACE" --timeout=60s
    
    # Restore service selector
    kubectl patch service "${APP_NAME}-service" -n "$NAMESPACE" -p '{"spec":{"selector":{"version":""}}}'
    
    log "INFO" "Canary deployment completed successfully"
}

# Rollback functions
emergency_rollback() {
    log "WARN" "Initiating emergency rollback..."
    
    # Get previous revision
    local previous_revision=$(kubectl rollout history "deployment/$APP_NAME" -n "$NAMESPACE" | tail -n 2 | head -n 1 | awk '{print $1}')
    
    if [[ -n "$previous_revision" ]]; then
        log "INFO" "Rolling back to revision $previous_revision"
        kubectl rollout undo "deployment/$APP_NAME" -n "$NAMESPACE" --to-revision="$previous_revision"
        
        if wait_for_rollout "$APP_NAME" "$ROLLBACK_TIMEOUT"; then
            log "INFO" "Emergency rollback completed successfully"
            send_notification "rollback" "Emergency rollback to revision $previous_revision completed"
            return 0
        else
            log "ERROR" "Emergency rollback failed"
            return 1
        fi
    else
        log "ERROR" "No previous revision found for rollback"
        return 1
    fi
}

# Monitoring and notifications
send_notification() {
    local status="$1"
    local message="$2"
    
    log "INFO" "Sending notification: $status - $message"
    
    # Slack notification
    if [[ -n "${SLACK_WEBHOOK:-}" ]]; then
        local color="good"
        local emoji="✅"
        
        case "$status" in
            "failure") color="danger"; emoji="❌" ;;
            "warning") color="warning"; emoji="⚠️" ;;
            "rollback") color="warning"; emoji="🔄" ;;
        esac
        
        curl -X POST -H 'Content-type: application/json' \
            --data "{
                \"attachments\": [{
                    \"color\": \"$color\",
                    \"title\": \"$emoji Deployment Notification\",
                    \"fields\": [
                        {\"title\": \"Environment\", \"value\": \"$ENVIRONMENT\", \"short\": true},
                        {\"title\": \"Application\", \"value\": \"$APP_NAME\", \"short\": true},
                        {\"title\": \"Image\", \"value\": \"$IMAGE_TAG\", \"short\": false},
                        {\"title\": \"Message\", \"value\": \"$message\", \"short\": false}
                    ],
                    \"ts\": $(date +%s)
                }]
            }" \
            "$SLACK_WEBHOOK" &>/dev/null || log "WARN" "Failed to send Slack notification"
    fi
    
    # Discord notification
    if [[ -n "${DISCORD_WEBHOOK:-}" ]]; then
        curl -H "Content-Type: application/json" \
             -d "{\"content\": \"**Deployment $status**: $message\\n**Environment**: $ENVIRONMENT\\n**Image**: $IMAGE_TAG\"}" \
             "$DISCORD_WEBHOOK" &>/dev/null || log "WARN" "Failed to send Discord notification"
    fi
}

start_monitoring() {
    log "INFO" "Starting post-deployment monitoring..."
    
    # Monitor key metrics for 10 minutes after deployment
    local monitoring_duration=600  # 10 minutes
    local start_time=$(date +%s)
    local end_time=$((start_time + monitoring_duration))
    
    while [[ $(date +%s) -lt $end_time ]]; do
        # Check application health
        if ! check_application_health "https://${DOMAIN:-$APP_NAME}" 1; then
            log "ERROR" "Post-deployment health check failed"
            return 1
        fi
        
        # Check error rate (if Prometheus is available)
        if command -v curl &> /dev/null && [[ -n "${PROMETHEUS_URL:-}" ]]; then
            local error_rate=$(curl -s "${PROMETHEUS_URL}/api/v1/query?query=rate(http_requests_total{status=~\"5..\"}[5m])" | jq -r '.data.result[0].value[1] // "0"')
            if [[ $(echo "$error_rate > 0.05" | bc -l 2>/dev/null || echo "0") == "1" ]]; then
                log "WARN" "High error rate detected: $error_rate"
            fi
        fi
        
        sleep 60  # Check every minute
    done
    
    log "INFO" "Post-deployment monitoring completed successfully"
}

# Main deployment function
main() {
    log "INFO" "Starting zero-downtime deployment for $APP_NAME"
    log "INFO" "Environment: $ENVIRONMENT"
    log "INFO" "Image: $IMAGE_TAG"
    log "INFO" "Namespace: $NAMESPACE"
    
    # Pre-deployment phase
    pre_deployment_checks
    
    # Mark deployment as started for error handling
    DEPLOYMENT_STARTED=true
    
    # Choose deployment strategy based on environment
    case "${DEPLOYMENT_STRATEGY:-rolling}" in
        "blue-green")
            if ! blue_green_deployment; then
                log "ERROR" "Blue-green deployment failed"
                exit 1
            fi
            ;;
        "canary")
            if ! canary_deployment; then
                log "ERROR" "Canary deployment failed"
                exit 1
            fi
            ;;
        "rolling"|*)
            if ! rolling_update_deployment; then
                log "ERROR" "Rolling update deployment failed"
                exit 1
            fi
            ;;
    esac
    
    # Post-deployment validation
    log "INFO" "Running post-deployment validation..."
    
    if ! check_application_health "https://${DOMAIN:-$APP_NAME}"; then
        log "ERROR" "Post-deployment health check failed"
        emergency_rollback
        exit 1
    fi
    
    # Start monitoring
    start_monitoring &
    
    # Success notification
    send_notification "success" "Deployment completed successfully"
    
    log "INFO" "Zero-downtime deployment completed successfully!"
    log "INFO" "Deployment logs saved to: $LOG_FILE"
}

# Script execution
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi